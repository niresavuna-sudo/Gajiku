import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, X, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function GajiPokok() {
  const [gajiList, setGajiList] = useState<any[]>([]);
  const [pegawaiList, setPegawaiList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    
    // Setup realtime subscription
    const channel = supabase
      .channel('gaji_pegawai_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gaji_pegawai' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setDbError(null);
    try {
      // Fetch all pegawai
      const { data: pegawaiData, error: pegawaiError } = await supabase
        .from('pegawai')
        .select('id, nama, tahun_masuk')
        .order('created_at', { ascending: true });
      
      if (pegawaiError) throw pegawaiError;

      // Fetch all gaji_pegawai
      const { data: gajiData, error: gajiError } = await supabase
        .from('gaji_pegawai')
        .select('*');
      
      if (gajiError) throw gajiError;
      
      const formattedData = (pegawaiData || []).map((p, index) => {
        const gaji = (gajiData || []).find((g: any) => g.pegawai_id === p.id);
        const currentYear = new Date().getFullYear();
        const masaKerja = p.tahun_masuk ? Math.max(0, currentYear - p.tahun_masuk) : 0;
        
        return {
          no: index + 1,
          pegawai_id: p.id,
          nama: p.nama,
          tahun_masuk: p.tahun_masuk,
          masa_kerja: masaKerja,
          gaji_id: gaji?.id || null,
          jam_mengajar: gaji?.jam_mengajar || 0,
          nominal_masa_kerja: gaji?.nominal_masa_kerja || 5000,
          tunjangan_masa_kerja: gaji?.tunjangan_masa_kerja || 0,
          nominal_jam_mengajar: gaji?.nominal_jam_mengajar || 16000,
          tunjangan_jam_mengajar: gaji?.tunjangan_jam_mengajar || 0,
          total_gaji_pokok: gaji?.total_gaji_pokok || 0,
        };
      });
      
      setGajiList(formattedData);
      setPegawaiList(pegawaiData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      if (error.message?.includes('gaji_pegawai') || error.code === '42P01') {
        setDbError('Tabel gaji_pegawai belum dibuat. Silakan jalankan script SQL yang disediakan.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [gajiToDelete, setGajiToDelete] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    pegawai_id: '',
    tahun_masuk: '',
    masa_kerja: '',
    nominal_masa_kerja: '5.000',
    tunjangan_masa_kerja: '',
    jam_mengajar: '',
    nominal_jam_mengajar: '16.000',
    tunjangan_jam_mengajar: '',
    total_gaji_pokok: ''
  });

  const handlePegawaiChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    const pegawai = pegawaiList.find(p => p.id === pId);
    
    let masaKerja = 0;
    let tahunMasuk = '';
    if (pegawai && pegawai.tahun_masuk) {
      tahunMasuk = pegawai.tahun_masuk.toString();
      const currentYear = new Date().getFullYear();
      masaKerja = Math.max(0, currentYear - pegawai.tahun_masuk);
    }
    
    setFormData(prev => {
      const nominalMK = parseFloat(String(prev.nominal_masa_kerja).replace(/\./g, '')) || 0;
      const tMasaKerja = masaKerja * nominalMK;
      
      const tJamMengajar = parseFloat(String(prev.tunjangan_jam_mengajar).replace(/\./g, '')) || 0;
      const totalGapok = tMasaKerja + tJamMengajar;
      
      return {
        ...prev,
        pegawai_id: pId,
        tahun_masuk: tahunMasuk,
        masa_kerja: masaKerja ? masaKerja.toString() : '0',
        tunjangan_masa_kerja: tMasaKerja ? tMasaKerja.toLocaleString('id-ID') : '0',
        total_gaji_pokok: totalGapok ? totalGapok.toLocaleString('id-ID') : '0'
      };
    });
  };

  const handleMasaKerjaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const mk = e.target.value;
    const mkNum = parseFloat(mk) || 0;
    
    setFormData(prev => {
      const nominalMK = parseFloat(String(prev.nominal_masa_kerja).replace(/\./g, '')) || 0;
      const tMasaKerja = mkNum * nominalMK;
      const tJamMengajar = parseFloat(String(prev.tunjangan_jam_mengajar).replace(/\./g, '')) || 0;
      const totalGapok = tMasaKerja + tJamMengajar;
      
      return {
        ...prev,
        masa_kerja: mk,
        tunjangan_masa_kerja: tMasaKerja ? tMasaKerja.toLocaleString('id-ID') : '0',
        total_gaji_pokok: totalGapok ? totalGapok.toLocaleString('id-ID') : '0'
      };
    });
  };

  const handleNominalMasaKerjaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    const nominalMK = parseFloat(val) || 0;
    
    setFormData(prev => {
      const mkNum = parseFloat(prev.masa_kerja) || 0;
      const tMasaKerja = mkNum * nominalMK;
      const tJamMengajar = parseFloat(String(prev.tunjangan_jam_mengajar).replace(/\./g, '')) || 0;
      const totalGapok = tMasaKerja + tJamMengajar;
      
      return {
        ...prev,
        nominal_masa_kerja: val ? Number(val).toLocaleString('id-ID') : '',
        tunjangan_masa_kerja: tMasaKerja ? tMasaKerja.toLocaleString('id-ID') : '0',
        total_gaji_pokok: totalGapok ? totalGapok.toLocaleString('id-ID') : '0'
      };
    });
  };

  const handleJamMengajarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const jm = e.target.value;
    const jmNum = parseFloat(jm) || 0;
    
    setFormData(prev => {
      const nominalJM = parseFloat(String(prev.nominal_jam_mengajar).replace(/\./g, '')) || 0;
      const tJamMengajar = jmNum * nominalJM;
      const tMasaKerja = parseFloat(String(prev.tunjangan_masa_kerja).replace(/\./g, '')) || 0;
      const totalGapok = tMasaKerja + tJamMengajar;
      
      return {
        ...prev,
        jam_mengajar: jm,
        tunjangan_jam_mengajar: tJamMengajar ? tJamMengajar.toLocaleString('id-ID') : '0',
        total_gaji_pokok: totalGapok ? totalGapok.toLocaleString('id-ID') : '0'
      };
    });
  };

  const handleNominalJamMengajarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    const nominalJM = parseFloat(val) || 0;
    
    setFormData(prev => {
      const jmNum = parseFloat(prev.jam_mengajar) || 0;
      const tJamMengajar = jmNum * nominalJM;
      const tMasaKerja = parseFloat(String(prev.tunjangan_masa_kerja).replace(/\./g, '')) || 0;
      const totalGapok = tMasaKerja + tJamMengajar;
      
      return {
        ...prev,
        nominal_jam_mengajar: val ? Number(val).toLocaleString('id-ID') : '',
        tunjangan_jam_mengajar: tJamMengajar ? tJamMengajar.toLocaleString('id-ID') : '0',
        total_gaji_pokok: totalGapok ? totalGapok.toLocaleString('id-ID') : '0'
      };
    });
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ pegawai_id: '', tahun_masuk: '', masa_kerja: '', nominal_masa_kerja: '5.000', tunjangan_masa_kerja: '', jam_mengajar: '', nominal_jam_mengajar: '16.000', tunjangan_jam_mengajar: '', total_gaji_pokok: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (gaji: any) => {
    setEditingId(gaji.gaji_id);
    const mk = gaji.masa_kerja?.toString() || '';
    const jm = gaji.jam_mengajar?.toString() || '';
    setFormData({ 
      pegawai_id: gaji.pegawai_id,
      tahun_masuk: gaji.tahun_masuk?.toString() || '',
      masa_kerja: mk,
      nominal_masa_kerja: gaji.nominal_masa_kerja ? Number(gaji.nominal_masa_kerja).toLocaleString('id-ID') : '5.000',
      tunjangan_masa_kerja: gaji.tunjangan_masa_kerja ? Number(gaji.tunjangan_masa_kerja).toLocaleString('id-ID') : '0',
      jam_mengajar: jm,
      nominal_jam_mengajar: gaji.nominal_jam_mengajar ? Number(gaji.nominal_jam_mengajar).toLocaleString('id-ID') : '16.000',
      tunjangan_jam_mengajar: gaji.tunjangan_jam_mengajar ? Number(gaji.tunjangan_jam_mengajar).toLocaleString('id-ID') : '0',
      total_gaji_pokok: gaji.total_gaji_pokok ? Number(gaji.total_gaji_pokok).toLocaleString('id-ID') : '0'
    });
    setShowModal(true);
  };

  const handleDelete = (gaji: any) => {
    if (!gaji.gaji_id) {
      alert('Data gaji belum diatur untuk pegawai ini.');
      return;
    }
    setGajiToDelete(gaji);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!gajiToDelete?.gaji_id) return;
    
    try {
      const { error } = await supabase
        .from('gaji_pegawai')
        .delete()
        .eq('id', gajiToDelete.gaji_id);
      if (error) throw error;
      
      setShowDeleteModal(false);
      setGajiToDelete(null);
      fetchData();
    } catch (error: any) {
      console.error('Error deleting gaji pegawai:', error);
      alert(`Gagal menghapus data gaji. Error: ${error.message || 'Unknown error'}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.pegawai_id) {
      alert('Silakan pilih pegawai terlebih dahulu.');
      return;
    }

    try {
      const tMasaKerja = parseFloat(String(formData.tunjangan_masa_kerja).replace(/\./g, '')) || 0;
      const tJamMengajar = parseFloat(String(formData.tunjangan_jam_mengajar).replace(/\./g, '')) || 0;
      const totalGapok = parseFloat(String(formData.total_gaji_pokok).replace(/\./g, '')) || 0;

      const payload = {
        pegawai_id: formData.pegawai_id,
        nominal_masa_kerja: parseFloat(String(formData.nominal_masa_kerja).replace(/\./g, '')) || 0,
        jam_mengajar: parseFloat(String(formData.jam_mengajar)) || 0,
        nominal_jam_mengajar: parseFloat(String(formData.nominal_jam_mengajar).replace(/\./g, '')) || 0,
        tunjangan_masa_kerja: tMasaKerja,
        tunjangan_jam_mengajar: tJamMengajar,
        total_gaji_pokok: totalGapok,
      };

      if (editingId !== null) {
        const { error } = await supabase
          .from('gaji_pegawai')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        // Check if already exists
        const existing = gajiList.find(g => g.pegawai_id === formData.pegawai_id && g.gaji_id);
        if (existing) {
          const { error } = await supabase
            .from('gaji_pegawai')
            .update(payload)
            .eq('id', existing.gaji_id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('gaji_pegawai')
            .insert([payload]);
          if (error) throw error;
        }
      }
      
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving gaji pegawai:', error);
      if (error.message?.includes('jam_mengajar') || error.message?.includes('masa_kerja') || error.message?.includes('nominal_')) {
        alert('Kolom baru belum ada di database. Silakan jalankan script SQL:\n\nALTER TABLE public.gaji_pegawai ADD COLUMN jam_mengajar NUMERIC DEFAULT 0;\nALTER TABLE public.gaji_pegawai ADD COLUMN masa_kerja NUMERIC DEFAULT 0;\nALTER TABLE public.gaji_pegawai ADD COLUMN nominal_masa_kerja NUMERIC DEFAULT 5000;\nALTER TABLE public.gaji_pegawai ADD COLUMN nominal_jam_mengajar NUMERIC DEFAULT 16000;');
      } else {
        alert(`Gagal menyimpan data gaji. Error: ${error.message || 'Unknown error'}`);
      }
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Gaji Pokok & Tunjangan</h2>
        <p className="text-slate-500">Atur gaji pokok dan tunjangan untuk masing-masing pegawai.</p>
      </div>

      {dbError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-bold mb-1">Database Setup Required</h3>
            <p className="text-sm mb-2">{dbError}</p>
            <div className="bg-white p-3 rounded border border-amber-100 text-xs font-mono overflow-x-auto">
              <pre>{`-- Jalankan script ini di Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS public.gaji_pegawai (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pegawai_id UUID REFERENCES public.pegawai(id) ON DELETE CASCADE,
    tunjangan_masa_kerja NUMERIC DEFAULT 0,
    tunjangan_jam_mengajar NUMERIC DEFAULT 0,
    total_gaji_pokok NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(pegawai_id)
);
ALTER TABLE public.gaji_pegawai ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access" ON public.gaji_pegawai FOR ALL USING (true);
alter publication supabase_realtime add table public.gaji_pegawai;`}</pre>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Tabel Gaji Pokok & Tunjangan</h3>
          <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors text-sm"
          >
            <Plus size={18} /> Atur Gaji Pegawai
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                <th rowSpan={2} className="p-4 font-medium w-16 text-center border-r border-slate-200">No.</th>
                <th rowSpan={2} className="p-4 font-medium border-r border-slate-200">Nama Pegawai</th>
                <th rowSpan={2} className="p-4 font-medium border-r border-slate-200 text-center">Tahun Masuk</th>
                <th colSpan={3} className="p-4 font-medium text-center border-r border-slate-200">Tunjangan Masa Kerja</th>
                <th colSpan={3} className="p-4 font-medium text-center border-r border-slate-200">Tunjangan Jam Mengajar</th>
                <th rowSpan={2} className="p-4 font-medium border-r border-slate-200 text-center">Total Gaji Pokok</th>
                <th rowSpan={2} className="p-4 font-medium text-center">Aksi</th>
              </tr>
              <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                <th className="p-2 font-medium text-center border-r border-slate-200 border-t border-slate-200">TMT (Tahun)</th>
                <th className="p-2 font-medium text-center border-r border-slate-200 border-t border-slate-200">Jml. Tunjangan</th>
                <th className="p-2 font-medium text-center border-r border-slate-200 border-t border-slate-200">Total</th>
                <th className="p-2 font-medium text-center border-r border-slate-200 border-t border-slate-200">Jml. Jam</th>
                <th className="p-2 font-medium text-center border-r border-slate-200 border-t border-slate-200">Jml. Tunjangan</th>
                <th className="p-2 font-medium text-center border-r border-slate-200 border-t border-slate-200">Total</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-200">
              {gajiList.map((g) => (
                <tr key={g.pegawai_id} className="hover:bg-slate-50">
                  <td className="p-4 text-slate-600 text-center border-r border-slate-200">{g.no}</td>
                  <td className="p-4 font-medium text-slate-800 border-r border-slate-200">{g.nama}</td>
                  <td className="p-4 text-slate-600 text-center border-r border-slate-200">{g.tahun_masuk || '-'}</td>
                  <td className="p-4 text-slate-600 text-center border-r border-slate-200">{g.masa_kerja}</td>
                  <td className="p-4 text-slate-600 border-r border-slate-200 text-right">
                    {g.nominal_masa_kerja ? `Rp ${Number(g.nominal_masa_kerja).toLocaleString('id-ID')}` : '-'}
                  </td>
                  <td className="p-4 text-slate-800 font-medium border-r border-slate-200 text-right">
                    {g.tunjangan_masa_kerja ? `Rp ${Number(g.tunjangan_masa_kerja).toLocaleString('id-ID')}` : '-'}
                  </td>
                  <td className="p-4 text-slate-600 text-center border-r border-slate-200">{g.jam_mengajar || '-'}</td>
                  <td className="p-4 text-slate-600 border-r border-slate-200 text-right">
                    {g.nominal_jam_mengajar ? `Rp ${Number(g.nominal_jam_mengajar).toLocaleString('id-ID')}` : '-'}
                  </td>
                  <td className="p-4 text-slate-800 font-medium border-r border-slate-200 text-right">
                    {g.tunjangan_jam_mengajar ? `Rp ${Number(g.tunjangan_jam_mengajar).toLocaleString('id-ID')}` : '-'}
                  </td>
                  <td className="p-4 text-slate-800 font-bold border-r border-slate-200 text-right bg-emerald-50/50">
                    {g.total_gaji_pokok ? `Rp ${Number(g.total_gaji_pokok).toLocaleString('id-ID')}` : '-'}
                  </td>
                  <td className="p-4 text-center space-x-2">
                    <button 
                      onClick={() => handleOpenEdit(g)}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors" 
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(g)}
                      className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 transition-colors" 
                      title="Hapus"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {gajiList.length === 0 && !dbError && (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-500">
                    Belum ada data pegawai. Silakan tambahkan pegawai di menu Data Awal.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">
                {editingId !== null ? 'Edit Gaji Pegawai' : 'Atur Gaji Pegawai'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pegawai</label>
                <select 
                  required
                  value={formData.pegawai_id} 
                  onChange={handlePegawaiChange} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  disabled={editingId !== null}
                >
                  <option value="">-- Pilih Pegawai --</option>
                  {pegawaiList.map(p => (
                    <option key={p.id} value={p.id}>{p.nama}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">TMT / Masa Kerja (Tahun)</label>
                  <input 
                    type="number" 
                    value={formData.masa_kerja} 
                    onChange={handleMasaKerjaChange} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50" 
                    placeholder="0" 
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jml. Tunjangan (Rp)</label>
                  <input 
                    type="text" 
                    value={formData.nominal_masa_kerja} 
                    onChange={handleNominalMasaKerjaChange} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                    placeholder="0" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Total Tunjangan (Rp)</label>
                  <input 
                    type="text" 
                    value={formData.tunjangan_masa_kerja} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-emerald-50 font-medium text-slate-700" 
                    placeholder="0" 
                    readOnly
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jml. Jam Mengajar</label>
                  <input 
                    type="number" 
                    value={formData.jam_mengajar} 
                    onChange={handleJamMengajarChange} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                    placeholder="0" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jml. Tunjangan (Rp)</label>
                  <input 
                    type="text" 
                    value={formData.nominal_jam_mengajar} 
                    onChange={handleNominalJamMengajarChange} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                    placeholder="0" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Total Tunjangan (Rp)</label>
                  <input 
                    type="text" 
                    value={formData.tunjangan_jam_mengajar} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-emerald-50 font-medium text-slate-700" 
                    placeholder="0" 
                    readOnly
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Total Gaji Pokok (Rp)</label>
                <input 
                  required 
                  type="text" 
                  value={formData.total_gaji_pokok} 
                  onChange={e => setFormData({...formData, total_gaji_pokok: e.target.value})} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50 font-bold" 
                  placeholder="0" 
                  readOnly
                />
              </div>
              <div className="flex justify-end pt-4 border-t border-slate-200 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg mr-2 transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Hapus Data Gaji</h3>
              <p className="text-slate-600">Apakah Anda yakin ingin menghapus data gaji untuk pegawai <strong>{gajiToDelete?.nama}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
            </div>
            <div className="flex justify-end p-4 border-t border-slate-200 bg-slate-50">
              <button 
                onClick={() => {
                  setShowDeleteModal(false);
                  setGajiToDelete(null);
                }} 
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg mr-2 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={confirmDelete} 
                className="px-4 py-2 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
