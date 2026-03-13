import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function Pelaporan() {
  const [sekolah, setSekolah] = useState<any>(null);
  const [pegawaiList, setPegawaiList] = useState<any[]>([]);
  const [gajiBulananList, setGajiBulananList] = useState<any[]>([]);
  const [selectedTahun, setSelectedTahun] = useState('2026');
  const [isLoading, setIsLoading] = useState(true);

  const bulanList = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  useEffect(() => {
    fetchData();
  }, [selectedTahun]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: profilData } = await supabase.from('profil_sekolah').select('*').limit(1).single();
      if (profilData) setSekolah(profilData);

      const { data: pegawaiData } = await supabase.from('pegawai').select('id, nama').order('created_at', { ascending: true });
      if (pegawaiData) setPegawaiList(pegawaiData);

      const { data: bulananData } = await supabase
        .from('gaji_bulanan')
        .select('*')
        .eq('tahun', selectedTahun);
      
      if (bulananData) setGajiBulananList(bulananData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
    
    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Laporan Rekapitulasi Penggajian Tahun ${selectedTahun}`, 14, 15);
    if (sekolah?.nama_sekolah) {
      doc.setFontSize(11);
      doc.text(sekolah.nama_sekolah, 14, 22);
    }

    const headers = [['No.', 'Nama Pegawai', ...bulanList, 'Total']];
    
    const data = pegawaiList.map((pegawai, index) => {
      const row = [
        index + 1,
        pegawai.nama,
        ...bulanList.map(bulan => {
          const gaji = getGajiBulan(pegawai.id, bulan);
          return gaji ? formatRupiah(gaji) : '-';
        }),
        formatRupiah(calculateTotalPegawai(pegawai.id))
      ];
      return row;
    });

    const totalRow = [
      { content: 'Total', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } },
      ...bulanList.map(bulan => {
        const totalBulan = calculateTotalBulan(bulan);
        return totalBulan ? formatRupiah(totalBulan) : '-';
      }),
      formatRupiah(calculateGrandTotal())
    ];

    data.push(totalRow);

    autoTable(doc, {
      head: headers,
      body: data,
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0], halign: 'center' },
      bodyStyles: { lineWidth: 0.1, lineColor: [0, 0, 0] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 }, // No
        1: { cellWidth: 35 }, // Nama
      },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index > 1) {
          data.cell.styles.halign = 'right';
        }
        if (data.section === 'body' && data.column.index === headers[0].length - 1) {
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.row.index === pegawaiList.length) { // Total row
           data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    // Signatures
    let finalY = (doc as any).lastAutoTable.finalY + 15;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    if (finalY + 35 > pageHeight) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    // Yayasan
    doc.text('Kepala Yayasan', pageWidth / 6, finalY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(sekolah?.kepala_yayasan_nama || '.......................', pageWidth / 6, finalY + 20, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${sekolah?.kepala_yayasan_nip || '-'}`, pageWidth / 6, finalY + 25, { align: 'center' });

    // Madrasah
    doc.text('Kepala Madrasah', pageWidth / 2, finalY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(sekolah?.kepala_madrasah_nama || '.......................', pageWidth / 2, finalY + 20, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${sekolah?.kepala_madrasah_nip || '-'}`, pageWidth / 2, finalY + 25, { align: 'center' });

    // Bendahara
    doc.text('Bendahara', (pageWidth * 5) / 6, finalY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(sekolah?.bendahara_nama || '.......................', (pageWidth * 5) / 6, finalY + 20, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${sekolah?.bendahara_nip || '-'}`, (pageWidth * 5) / 6, finalY + 25, { align: 'center' });

    doc.save(`Laporan_Penggajian_Tahun_${selectedTahun}.pdf`);
  };

  const formatRupiah = (angka: number) => {
    return angka.toLocaleString('id-ID');
  };

  const getGajiBulan = (pegawaiId: string, bulan: string) => {
    const data = gajiBulananList.find(g => g.pegawai_id === pegawaiId && g.bulan === bulan);
    return data ? data.gaji_bersih : null;
  };

  const calculateTotalBulan = (bulan: string) => {
    return gajiBulananList.filter(g => g.bulan === bulan).reduce((sum, item) => sum + (item.gaji_bersih || 0), 0);
  };

  const calculateTotalPegawai = (pegawaiId: string) => {
    return gajiBulananList.filter(g => g.pegawai_id === pegawaiId).reduce((sum, item) => sum + (item.gaji_bersih || 0), 0);
  };

  const calculateGrandTotal = () => {
    return gajiBulananList.reduce((sum, item) => sum + (item.gaji_bersih || 0), 0);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Pelaporan</h2>
          <p className="text-slate-500">Laporan rekapitulasi penggajian tahunan.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={selectedTahun}
            onChange={(e) => setSelectedTahun(e.target.value)}
          >
            <option value="2026">2026</option>
          </select>
          <button 
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Download size={18} /> Unduh PDF
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-x-auto print:p-0 print:border-none print:shadow-none print:overflow-visible">
        <style>
          {`
            @media print {
              @page { size: landscape; margin: 10mm; }
              body { font-size: 10pt; background: white; }
              .print\\:hidden { display: none !important; }
              .print\\:p-0 { padding: 0 !important; }
              .print\\:border-none { border: none !important; }
              .print\\:shadow-none { box-shadow: none !important; }
              .print\\:overflow-visible { overflow: visible !important; }
            }
          `}
        </style>
        
        <table className="w-full min-w-max text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
              <th className="p-4 font-medium w-16 text-center border-r border-slate-200">No.</th>
              <th className="p-4 font-medium border-r border-slate-200 min-w-[150px]">Nama Pegawai</th>
              {bulanList.map(bulan => (
                <th key={bulan} className="p-4 font-medium text-center border-r border-slate-200">{bulan}</th>
              ))}
              <th className="p-4 font-medium text-center">Total</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-slate-200">
            {pegawaiList.map((pegawai, index) => {
              const totalPegawai = calculateTotalPegawai(pegawai.id);
              return (
                <tr key={pegawai.id} className="hover:bg-slate-50">
                  <td className="p-4 text-slate-600 text-center border-r border-slate-200">{index + 1}</td>
                  <td className="p-4 font-medium text-slate-800 border-r border-slate-200">{pegawai.nama}</td>
                  {bulanList.map(bulan => {
                    const gaji = getGajiBulan(pegawai.id, bulan);
                    return (
                      <td key={bulan} className="p-4 text-slate-600 text-right border-r border-slate-200">
                        {gaji ? formatRupiah(gaji) : '-'}
                      </td>
                    );
                  })}
                  <td className="p-4 text-slate-800 font-bold text-right bg-emerald-50/50">
                    {totalPegawai ? formatRupiah(totalPegawai) : '-'}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
              <td colSpan={2} className="p-4 text-center border-r border-slate-200">Total Keseluruhan</td>
              {bulanList.map(bulan => {
                const totalBulan = calculateTotalBulan(bulan);
                return (
                  <td key={bulan} className="p-4 text-right border-r border-slate-200">
                    {totalBulan ? formatRupiah(totalBulan) : '-'}
                  </td>
                );
              })}
              <td className="p-4 text-right">
                {formatRupiah(calculateGrandTotal())}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="hidden print:flex mt-12 justify-between text-center text-sm print:break-inside-avoid">
          <div className="w-1/3">
            <p className="mb-20">Kepala Yayasan</p>
            <p className="font-bold underline">{sekolah?.kepala_yayasan_nama || '.......................'}</p>
            <p>NIP. {sekolah?.kepala_yayasan_nip || '-'}</p>
          </div>
          <div className="w-1/3">
            <p className="mb-20">Kepala Madrasah</p>
            <p className="font-bold underline">{sekolah?.kepala_madrasah_nama || '.......................'}</p>
            <p>NIP. {sekolah?.kepala_madrasah_nip || '-'}</p>
          </div>
          <div className="w-1/3">
            <p className="mb-20">Bendahara</p>
            <p className="font-bold underline">{sekolah?.bendahara_nama || '.......................'}</p>
            <p>NIP. {sekolah?.bendahara_nip || '-'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
