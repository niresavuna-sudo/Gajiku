import React, { useState, useEffect, useRef } from 'react';
import { FileText, PenTool, Printer, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useReactToPrint } from 'react-to-print';

const SlipGaji = ({ data, sekolah, bulan, tahun }: { data: any, sekolah: any, bulan: string, tahun: string }) => {
  const uraianList = [
    { name: "Gaji Pokok", value: data.gaji_pokok },
    { name: "Insentif Kehadiran", value: data.total_insentif },
  ];

  if (data.tugas_tambahan_ids && data.tugas_tambahan_ids.length > 0) {
    data.tugas_tambahan_ids.forEach((id: string, idx: number) => {
      uraianList.push({
        name: data.nama_tugas_list[idx] || "Tugas Tambahan",
        value: data.nominal_tugas_list[idx] || 0
      });
    });
  } else if (data.nominal_tugas_tambahan > 0) {
    uraianList.push({
      name: data.nama_tugas || "Tugas Tambahan",
      value: data.nominal_tugas_tambahan
    });
  }

  // Fill empty rows to make it look like a standard slip
  const emptyRowsCount = Math.max(0, 15 - uraianList.length);
  for (let i = 0; i < emptyRowsCount; i++) {
    uraianList.push({ name: "", value: 0 });
  }

  const totalGaji = data.gaji_pokok + data.total_insentif + data.nominal_tugas_tambahan;

  return (
    <div className="w-full h-full flex flex-col text-black bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center border-b border-black pb-1 mb-1 relative">
        <div className="absolute left-0 top-0 w-12 h-12 flex items-center justify-center">
          {sekolah?.logo_slip ? (
            <img src={sekolah.logo_slip} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          ) : (
            <svg viewBox="0 0 100 100" className="w-full h-full text-black fill-current">
              <polygon points="50,5 95,30 95,70 50,95 5,70 5,30" fill="none" stroke="black" strokeWidth="1"/>
              <circle cx="50" cy="50" r="20" fill="none" stroke="black" strokeWidth="1"/>
              <path d="M 30 50 Q 50 70 70 50" fill="none" stroke="black" strokeWidth="1"/>
              <path d="M 20 30 L 80 30" stroke="black" strokeWidth="1"/>
            </svg>
          )}
        </div>
        <div className="text-center w-full px-14">
          <div className="font-bold text-sm leading-tight">SLIP GAJI</div>
          <div className="text-sm leading-tight font-bold uppercase">{sekolah?.nama_sekolah || 'NAMA SEKOLAH'}</div>
          <div className="text-xs leading-tight">Tahun Anggaran : {tahun}</div>
        </div>
      </div>

      {/* Info */}
      <div className="grid grid-cols-[70px_1fr] gap-x-1 mb-1 text-[10px]">
        <div>Bulan:</div>
        <div>{bulan}</div>
        <div>Nama Pegawai:</div>
        <div className="font-bold">{data.nama}</div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse border border-black text-[9px] mb-1 flex-1">
        <thead>
          <tr>
            <th className="border border-black w-6 py-0.5">No.</th>
            <th className="border border-black py-0.5">Uraian</th>
            <th className="border border-black w-20 py-0.5">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {uraianList.map((uraian, idx) => (
            <tr key={idx} className="h-3.5">
              <td className="border border-black text-center py-0">{uraian.name ? idx + 1 : ''}</td>
              <td className="border border-black px-1 py-0">{uraian.name}</td>
              <td className="border border-black px-1 py-0 text-right">
                {uraian.value > 0 ? uraian.value.toLocaleString('id-ID') : (uraian.name ? '-' : '')}
              </td>
            </tr>
          ))}
          <tr className="h-4">
            <td colSpan={2} className="border border-black px-1 py-0 font-bold">Total Gaji</td>
            <td className="border border-black px-1 py-0 text-right font-bold">{totalGaji.toLocaleString('id-ID')}</td>
          </tr>
          <tr className="h-4">
            <td colSpan={2} className="border border-black px-1 py-0 font-bold">Potongan Gaji (-)</td>
            <td className="border border-black px-1 py-0 text-right font-bold">{data.potongan > 0 ? data.potongan.toLocaleString('id-ID') : '-'}</td>
          </tr>
          <tr className="h-5">
            <td colSpan={2} className="border border-black px-1 py-0 font-bold italic text-right pr-2 text-[10px]">GAJI DITERIMA:</td>
            <td className="border border-black px-1 py-0 text-right font-bold italic text-[10px]" style={{ borderBottom: '3px double black' }}>{data.gaji_bersih.toLocaleString('id-ID')}</td>
          </tr>
        </tbody>
      </table>

      {/* Footer */}
      <div className="flex justify-between text-[9px] mt-1 px-2">
        <div className="text-center flex flex-col justify-between h-full">
          <div>
            <div className="mb-1 text-transparent select-none">Spacer</div>
            <div className="mb-8">Kepala Madrasah</div>
          </div>
          <div>
            <div className="italic mb-1">ttd</div>
            <div className="font-bold underline">{sekolah?.kepala_madrasah_nama || '.......................'}</div>
          </div>
        </div>
        <div className="text-center flex flex-col justify-between h-full">
          <div>
            <div className="mb-1">{sekolah?.desa || '..........'}, 31 {bulan} {tahun}</div>
            <div className="mb-8">Bendahara</div>
          </div>
          <div>
            <div className="italic mb-1">ttd</div>
            <div className="font-bold underline">{sekolah?.bendahara_nama || '.......................'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

const LembarTtd = ({ data, sekolah, bulan, tahun }: { data: any[], sekolah: any, bulan: string, tahun: string }) => {
  const totalKeseluruhan = data.reduce((sum, item) => sum + item.gaji_bersih, 0);

  return (
    <div className="w-full text-black bg-white" style={{ fontFamily: 'Arial, sans-serif', padding: '10mm' }}>
      <div className="text-center mb-6">
        <h2 className="font-bold text-lg uppercase">DAFTAR PENERIMAAN HONORARIUM</h2>
        <h3 className="font-bold text-md uppercase">{sekolah?.nama_sekolah || 'NAMA SEKOLAH'}</h3>
        <p className="text-sm">Bulan: {bulan} Tahun: {tahun}</p>
      </div>

      <table className="w-full border-collapse border border-black text-sm mb-8">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black py-2 px-2 w-12 text-center">No.</th>
            <th className="border border-black py-2 px-2 text-left">Nama Pegawai</th>
            <th className="border border-black py-2 px-2 text-right w-32">Jumlah Diterima</th>
            <th className="border border-black py-2 px-2 w-48 text-center">Tanda Tangan</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr key={idx}>
              <td className="border border-black py-3 px-2 text-center">{idx + 1}</td>
              <td className="border border-black py-3 px-2">{item.nama}</td>
              <td className="border border-black py-3 px-2 text-right">Rp {item.gaji_bersih.toLocaleString('id-ID')}</td>
              <td className="border border-black py-3 px-2 relative">
                <span className="absolute top-1 left-2 text-xs text-gray-500">{idx + 1}.</span>
              </td>
            </tr>
          ))}
          <tr className="bg-gray-100 font-bold">
            <td colSpan={2} className="border border-black py-2 px-2 text-right">Total Keseluruhan</td>
            <td className="border border-black py-2 px-2 text-right">Rp {totalKeseluruhan.toLocaleString('id-ID')}</td>
            <td className="border border-black py-2 px-2"></td>
          </tr>
        </tbody>
      </table>

      <div className="flex justify-between text-sm mt-8 px-8">
        <div className="text-center">
          <div className="mb-16">Kepala Madrasah</div>
          <div className="font-bold underline">{sekolah?.kepala_madrasah_nama || '.......................'}</div>
        </div>
        <div className="text-center">
          <div className="mb-16">{sekolah?.desa || '..........'}, 31 {bulan} {tahun}<br/>Bendahara</div>
          <div className="font-bold underline">{sekolah?.bendahara_nama || '.......................'}</div>
        </div>
      </div>
    </div>
  );
};

export function Cetak() {
  const [activeTab, setActiveTab] = useState<'slip' | 'ttd'>('slip');
  const [pegawaiList, setPegawaiList] = useState<any[]>([]);
  const [selectedPegawai, setSelectedPegawai] = useState<string>('all');
  const [selectedBulan, setSelectedBulan] = useState<string>('Januari');
  const [sekolahData, setSekolahData] = useState<any>(null);
  const [gajiData, setGajiData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const tahunAnggaran = '2026';
  const componentRef = useRef<HTMLDivElement>(null);

  const bulanList = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  useEffect(() => {
    fetchPegawai();
    fetchSekolah();
  }, []);

  useEffect(() => {
    fetchGajiData();
  }, [selectedBulan, selectedPegawai]);

  const fetchSekolah = async () => {
    try {
      const { data: profilData, error: profilError } = await supabase
        .from('profil_sekolah')
        .select('*')
        .limit(1)
        .single();
        
      const { data: pengaturanData } = await supabase
        .from('pengaturan')
        .select('logo_url')
        .limit(1)
        .single();

      if (!profilError && profilData) {
        setSekolahData({
          ...profilData,
          logo_slip: pengaturanData?.logo_url || profilData.logo_slip
        });
      }
    } catch (error) {
      console.error('Error fetching sekolah:', error);
    }
  };

  const fetchPegawai = async () => {
    try {
      const { data, error } = await supabase
        .from('pegawai')
        .select('id, nama')
        .order('nama', { ascending: true });
      
      if (error) throw error;
      setPegawaiList(data || []);
    } catch (error) {
      console.error('Error fetching pegawai:', error);
    }
  };

  const fetchGajiData = async () => {
    setIsLoading(true);
    try {
      // Fetch Tugas Tambahan
      const { data: tugasData } = await supabase
        .from('tugas_tambahan')
        .select('id, nama_tugas, nominal');

      let query = supabase
        .from('gaji_bulanan')
        .select('*, pegawai(nama)')
        .eq('bulan', selectedBulan)
        .eq('tahun', tahunAnggaran)
        .eq('is_approved', true);

      if (selectedPegawai !== 'all') {
        query = query.eq('pegawai_id', selectedPegawai);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Fetch Gaji Pokok
      const { data: gajiPokokData } = await supabase
        .from('gaji_pegawai')
        .select('pegawai_id, total_gaji_pokok');

      const formattedData = (data || []).map(gb => {
        const gp = gajiPokokData?.find(g => g.pegawai_id === gb.pegawai_id);
        
        let tugasIds: string[] = [];
        if (gb?.tugas_tambahan_ids && Array.isArray(gb.tugas_tambahan_ids)) {
          tugasIds = gb.tugas_tambahan_ids;
        } else if (gb?.tugas_tambahan_id) {
          tugasIds = [gb.tugas_tambahan_id];
        }

        const namaTugasList = tugasIds.map(id => {
          const t = tugasData?.find(x => x.id === id);
          return t ? t.nama_tugas : '';
        }).filter(Boolean);

        const nominalTugasList = tugasIds.map(id => {
          const t = tugasData?.find(x => x.id === id);
          return t ? parseFloat(t.nominal) : 0;
        }).filter(Boolean);

        return {
          ...gb,
          nama: gb.pegawai?.nama || '-',
          gaji_pokok: gp?.total_gaji_pokok || 0,
          nama_tugas_list: namaTugasList,
          nominal_tugas_list: nominalTugasList,
          nama_tugas: namaTugasList.join(', ')
        };
      });

      // Sort by name
      formattedData.sort((a, b) => a.nama.localeCompare(b.nama));

      setGajiData(formattedData);
    } catch (error) {
      console.error('Error fetching gaji data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: activeTab === 'slip' ? `Slip_Gaji_${selectedBulan}_${tahunAnggaran}` : `Lembar_TTD_${selectedBulan}_${tahunAnggaran}`,
  });

  const isIframe = window !== window.top;

  return (
    <div className="space-y-6 print:space-y-0">
      <div className="print:hidden">
        <h2 className="text-2xl font-bold text-slate-800">Cetak Dokumen</h2>
        <p className="text-slate-500">Cetak slip gaji pegawai dan lembar tanda terima gaji.</p>
        {isIframe && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <ExternalLink className="text-amber-600 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <h4 className="font-medium text-amber-800">Fitur Cetak Diblokir?</h4>
              <p className="text-sm text-amber-600 mt-1">
                Jika jendela cetak tidak muncul saat tombol diklik, hal ini karena Anda sedang membuka aplikasi di dalam mode <i>preview</i>. 
                Silakan buka aplikasi ini di tab baru dengan mengklik ikon panah di pojok kanan atas layar Anda, lalu coba cetak kembali.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none print:rounded-none">
        <div className="flex border-b border-slate-200 print:hidden">
          <button
            onClick={() => setActiveTab('slip')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'slip' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText size={18} />
            Slip Gaji
          </button>
          <button
            onClick={() => setActiveTab('ttd')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'ttd' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <PenTool size={18} />
            Lembar Tanda Terima (TTD)
          </button>
        </div>

        <div className="p-6 print:p-0">
          <div className="flex flex-wrap gap-4 items-end mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200 print:hidden">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bulan</label>
              <select 
                value={selectedBulan}
                onChange={(e) => setSelectedBulan(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white min-w-[150px]"
              >
                {bulanList.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            {activeTab === 'slip' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pegawai</label>
                <select 
                  value={selectedPegawai}
                  onChange={(e) => setSelectedPegawai(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white min-w-[200px]"
                >
                  <option value="all">Semua Pegawai</option>
                  {pegawaiList.map((pegawai) => (
                    <option key={pegawai.id} value={pegawai.id}>{pegawai.nama}</option>
                  ))}
                </select>
              </div>
            )}
            <button 
              onClick={() => handlePrint()}
              className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors ml-auto flex items-center gap-2"
            >
              <Printer size={18} />
              Cetak/Pdf
            </button>
          </div>

          <div className="bg-slate-200 rounded-xl p-8 flex justify-center overflow-auto print:bg-white print:p-0 print:overflow-visible">
            {isLoading ? (
              <div className="text-slate-500 py-10">Memuat data...</div>
            ) : gajiData.length === 0 ? (
              <div className="text-slate-500 py-10">Tidak ada data gaji yang sudah di-approve untuk filter yang dipilih.</div>
            ) : (
              <div 
                ref={componentRef}
                className="bg-white shadow-xl flex-shrink-0 print:shadow-none" 
                style={{ 
                  width: '210mm', 
                  minHeight: '297mm', 
                  padding: '10mm',
                  display: activeTab === 'slip' ? 'flex' : 'block',
                  flexWrap: 'wrap',
                  justifyContent: gajiData.length === 1 ? 'center' : 'space-between',
                  alignItems: gajiData.length === 1 ? 'flex-start' : 'flex-start',
                  alignContent: 'flex-start',
                  gap: '10mm'
                }}
              >
                {activeTab === 'slip' ? (
                  gajiData.map((data, index) => (
                    <div key={index} style={{ height: '133.5mm', width: gajiData.length === 1 ? '90mm' : 'calc(50% - 5mm)', pageBreakInside: 'avoid', marginTop: gajiData.length === 1 ? '20mm' : '0' }}>
                      <SlipGaji data={data} sekolah={sekolahData} bulan={selectedBulan} tahun={tahunAnggaran} />
                    </div>
                  ))
                ) : (
                  <LembarTtd data={gajiData} sekolah={sekolahData} bulan={selectedBulan} tahun={tahunAnggaran} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
