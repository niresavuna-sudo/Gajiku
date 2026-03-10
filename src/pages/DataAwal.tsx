import React, { useState, useEffect } from 'react';
import { Building, Users, Briefcase, Edit2, Trash2, Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function DataAwal() {
  const [activeTab, setActiveTab] = useState<'sekolah' | 'pegawai' | 'tugas'>('sekolah');

  const [pegawaiList, setPegawaiList] = useState<any[]>([]);
  const [tugasList, setTugasList] = useState<any[]>([]);
  const [sekolahData, setSekolahData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();

    // Subscribe to realtime changes
    const pegawaiSubscription = supabase
      .channel('pegawai_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pegawai' }, () => {
        fetchData();
      })
      .subscribe();

    const tugasSubscription = supabase
      .channel('tugas_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tugas_tambahan' }, () => {
        fetchData();
      })
      .subscribe();

    const sekolahSubscription = supabase
      .channel('sekolah_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profil_sekolah' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(pegawaiSubscription);
      supabase.removeChannel(tugasSubscription);
      supabase.removeChannel(sekolahSubscription);
    };
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch Pegawai
      const { data: pegawaiData, error: pegawaiError } = await supabase
        .from('pegawai')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (pegawaiError) throw pegawaiError;
      
      // Add 'no' property for display
      const formattedPegawai = (pegawaiData || []).map((p, index) => ({
        ...p,
        no: index + 1,
        ttl: p.tempat_tgl_lahir,
        tahunMasuk: p.tahun_masuk,
      }));
      setPegawaiList(formattedPegawai);

      // Fetch Tugas Tambahan
      const { data: tugasData, error: tugasError } = await supabase
        .from('tugas_tambahan')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (tugasError) throw tugasError;
      
      const formattedTugas = (tugasData || []).map((t, index) => ({
        ...t,
        no: index + 1,
        nama: t.nama_tugas,
      }));
      setTugasList(formattedTugas);

      // Fetch Sekolah Data
      const { data: sekolahData, error: sekolahError } = await supabase
        .from('profil_sekolah')
        .select('*')
        .limit(1)
        .single();
      
      if (sekolahError && sekolahError.code !== 'PGRST116') throw sekolahError; // Ignore not found error
      
      if (sekolahData) {
        setSekolahData(sekolahData);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const [showPegawaiModal, setShowPegawaiModal] = useState(false);
  const [showTugasModal, setShowTugasModal] = useState(false);
  const [editingPegawaiId, setEditingPegawaiId] = useState<string | null>(null);
  const [editingTugasId, setEditingTugasId] = useState<string | null>(null);

  const [showDeletePegawaiModal, setShowDeletePegawaiModal] = useState(false);
  const [pegawaiToDelete, setPegawaiToDelete] = useState<any>(null);

  const [showDeleteTugasModal, setShowDeleteTugasModal] = useState(false);
  const [tugasToDelete, setTugasToDelete] = useState<any>(null);

  const [newPegawai, setNewPegawai] = useState({ nama: '', nip: '', ttl: '', alamat: '', kontak: '', status: 'Guru PNS', jab: '', tahunMasuk: '' });
  const [newTugas, setNewTugas] = useState({ nama: '', nominal: '' });

  const handleOpenAddPegawai = () => {
    setEditingPegawaiId(null);
    setNewPegawai({ nama: '', nip: '', ttl: '', alamat: '', kontak: '', status: 'Guru PNS', jab: '', tahunMasuk: '' });
    setShowPegawaiModal(true);
  };

  const handleOpenEditPegawai = (pegawai: any) => {
    setEditingPegawaiId(pegawai.id);
    setNewPegawai({ ...pegawai });
    setShowPegawaiModal(true);
  };

  const handleAddPegawai = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        nama: newPegawai.nama,
        nip: newPegawai.nip,
        tempat_tgl_lahir: newPegawai.ttl,
        tahun_masuk: newPegawai.tahunMasuk ? parseInt(newPegawai.tahunMasuk) : null,
        alamat: newPegawai.alamat,
        kontak: newPegawai.kontak,
        status: newPegawai.status,
        jabatan: newPegawai.jab,
      };

      if (editingPegawaiId !== null) {
        const { error } = await supabase
          .from('pegawai')
          .update(payload)
          .eq('id', editingPegawaiId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pegawai')
          .insert([payload]);
        if (error) throw error;
      }
      
      setShowPegawaiModal(false);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error saving pegawai:', error);
      alert('Gagal menyimpan data pegawai. Pastikan koneksi Supabase sudah diatur.');
    }
  };

  const handleDeletePegawai = (pegawai: any) => {
    setPegawaiToDelete(pegawai);
    setShowDeletePegawaiModal(true);
  };

  const confirmDeletePegawai = async () => {
    if (!pegawaiToDelete?.id) return;
    
    try {
      // Attempt to delete related records first (ignore errors if tables don't exist)
      try { await supabase.from('pegawai_tugas').delete().eq('pegawai_id', pegawaiToDelete.id); } catch (e) {}
      try { await supabase.from('riwayat_gaji').delete().eq('pegawai_id', pegawaiToDelete.id); } catch (e) {}
      try { await supabase.from('gaji_pegawai').delete().eq('pegawai_id', pegawaiToDelete.id); } catch (e) {}

      const { error } = await supabase
        .from('pegawai')
        .delete()
        .eq('id', pegawaiToDelete.id);
      if (error) throw error;
      
      setShowDeletePegawaiModal(false);
      setPegawaiToDelete(null);
      fetchData();
    } catch (error: any) {
      console.error('Error deleting pegawai:', error);
      alert(`Gagal menghapus data pegawai. Error: ${error.message || 'Unknown error'}`);
    }
  };

  const handleOpenAddTugas = () => {
    setEditingTugasId(null);
    setNewTugas({ nama: '', nominal: '' });
    setShowTugasModal(true);
  };

  const handleOpenEditTugas = (tugas: any) => {
    setEditingTugasId(tugas.id);
    setNewTugas({ 
      ...tugas, 
      nominal: tugas.nominal ? Number(tugas.nominal).toLocaleString('id-ID') : '' 
    });
    setShowTugasModal(true);
  };

  const handleAddTugas = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Remove dots from nominal string to save as number
      const nominalStr = String(newTugas.nominal);
      const nominalValue = parseFloat(nominalStr.replace(/\./g, '')) || 0;
      
      const payload = {
        nama_tugas: newTugas.nama,
        nominal: nominalValue,
      };

      if (editingTugasId !== null) {
        const { error } = await supabase
          .from('tugas_tambahan')
          .update(payload)
          .eq('id', editingTugasId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tugas_tambahan')
          .insert([payload]);
        if (error) throw error;
      }
      
      setShowTugasModal(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving tugas:', error);
      alert(`Gagal menyimpan data tugas. Error: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDeleteTugas = (tugas: any) => {
    setTugasToDelete(tugas);
    setShowDeleteTugasModal(true);
  };

  const confirmDeleteTugas = async () => {
    if (!tugasToDelete?.id) return;
    
    try {
      // Attempt to delete related records first (ignore errors if tables don't exist)
      try { await supabase.from('pegawai_tugas').delete().eq('tugas_id', tugasToDelete.id); } catch (e) {}

      const { error } = await supabase
        .from('tugas_tambahan')
        .delete()
        .eq('id', tugasToDelete.id);
      if (error) throw error;
      
      setShowDeleteTugasModal(false);
      setTugasToDelete(null);
      fetchData();
    } catch (error: any) {
      console.error('Error deleting tugas:', error);
      alert(`Gagal menghapus data tugas. Error: ${error.message || 'Unknown error'}`);
    }
  };

  const handleSaveSekolah = async () => {
    try {
      const { id, created_at, updated_at, ...payload } = sekolahData;
      if (sekolahData.id) {
        const { error } = await supabase
          .from('profil_sekolah')
          .update(payload)
          .eq('id', sekolahData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('profil_sekolah')
          .insert([payload]);
        if (error) throw error;
      }
      alert('Data sekolah berhasil disimpan!');
      fetchData();
    } catch (error: any) {
      console.error('Error saving sekolah:', error);
      alert(`Gagal menyimpan data sekolah. Error: ${error.message || 'Unknown error'}`);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Data Awal</h2>
        <p className="text-slate-500">Kelola data master sekolah, pegawai, dan tugas tambahan.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('sekolah')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'sekolah' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building size={18} />
            Data Sekolah
          </button>
          <button
            onClick={() => setActiveTab('pegawai')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'pegawai' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users size={18} />
            Data Pegawai
          </button>
          <button
            onClick={() => setActiveTab('tugas')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'tugas' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Briefcase size={18} />
            Tugas Tambahan
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'sekolah' && (
            <div className="max-w-2xl space-y-4">
              <div className="grid grid-cols-3 gap-4 items-center">
                <label className="text-sm font-medium text-slate-700">Nama Sekolah</label>
                <input type="text" value={sekolahData.nama_sekolah || ''} onChange={e => setSekolahData({...sekolahData, nama_sekolah: e.target.value})} className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="SMA Negeri 1 Contoh" />
              </div>
              <div className="grid grid-cols-3 gap-4 items-center">
                <label className="text-sm font-medium text-slate-700">NPSN</label>
                <input type="text" value={sekolahData.npsn || ''} onChange={e => setSekolahData({...sekolahData, npsn: e.target.value})} className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="10293847" />
              </div>
              <div className="grid grid-cols-3 gap-4 items-start">
                <label className="text-sm font-medium text-slate-700 pt-2">Alamat</label>
                <textarea value={sekolahData.alamat || ''} onChange={e => setSekolahData({...sekolahData, alamat: e.target.value})} className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={2} placeholder="Jl. Pendidikan No. 123"></textarea>
              </div>
              <div className="grid grid-cols-3 gap-4 items-center">
                <label className="text-sm font-medium text-slate-700">Desa</label>
                <input type="text" value={sekolahData.desa || ''} onChange={e => setSekolahData({...sekolahData, desa: e.target.value})} className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Sukamaju" />
              </div>
              <div className="grid grid-cols-3 gap-4 items-center">
                <label className="text-sm font-medium text-slate-700">Kecamatan</label>
                <input type="text" value={sekolahData.kecamatan || ''} onChange={e => setSekolahData({...sekolahData, kecamatan: e.target.value})} className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Sukarame" />
              </div>
              <div className="grid grid-cols-3 gap-4 items-center">
                <label className="text-sm font-medium text-slate-700">Kabupaten</label>
                <input type="text" value={sekolahData.kabupaten || ''} onChange={e => setSekolahData({...sekolahData, kabupaten: e.target.value})} className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Kota Belajar" />
              </div>
              <div className="grid grid-cols-3 gap-4 items-center">
                <label className="text-sm font-medium text-slate-700">Provinsi</label>
                <input type="text" value={sekolahData.provinsi || ''} onChange={e => setSekolahData({...sekolahData, provinsi: e.target.value})} className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Jawa Barat" />
              </div>
              
              <div className="pt-4 pb-2 border-b border-slate-200">
                <h3 className="font-bold text-slate-800">Data Pejabat Sekolah</h3>
              </div>

              <div className="grid grid-cols-3 gap-4 items-center">
                <label className="text-sm font-medium text-slate-700">Kepala Yayasan</label>
                <div className="col-span-2 grid grid-cols-2 gap-2">
                  <input type="text" value={sekolahData.kepala_yayasan_nama || ''} onChange={e => setSekolahData({...sekolahData, kepala_yayasan_nama: e.target.value})} placeholder="Nama Lengkap" className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  <input type="text" value={sekolahData.kepala_yayasan_nip || ''} onChange={e => setSekolahData({...sekolahData, kepala_yayasan_nip: e.target.value})} placeholder="NIP/NIK" className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 items-center">
                <label className="text-sm font-medium text-slate-700">Kepala Madrasah / Sekolah</label>
                <div className="col-span-2 grid grid-cols-2 gap-2">
                  <input type="text" value={sekolahData.kepala_madrasah_nama || ''} onChange={e => setSekolahData({...sekolahData, kepala_madrasah_nama: e.target.value})} placeholder="Nama Lengkap" className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  <input type="text" value={sekolahData.kepala_madrasah_nip || ''} onChange={e => setSekolahData({...sekolahData, kepala_madrasah_nip: e.target.value})} placeholder="NIP/NIK" className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 items-center">
                <label className="text-sm font-medium text-slate-700">Bendahara</label>
                <div className="col-span-2 grid grid-cols-2 gap-2">
                  <input type="text" value={sekolahData.bendahara_nama || ''} onChange={e => setSekolahData({...sekolahData, bendahara_nama: e.target.value})} placeholder="Nama Lengkap" className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  <input type="text" value={sekolahData.bendahara_nip || ''} onChange={e => setSekolahData({...sekolahData, bendahara_nip: e.target.value})} placeholder="NIP/NIK" className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button onClick={handleSaveSekolah} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors">
                  Simpan Perubahan
                </button>
              </div>
            </div>
          )}

          {activeTab === 'pegawai' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <input 
                  type="text" 
                  placeholder="Cari pegawai..." 
                  className="px-4 py-2 border border-slate-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button 
                  onClick={handleOpenAddPegawai}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                >
                  <Plus size={18} /> Tambah Pegawai
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-max text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                      <th className="p-3 font-medium text-center">No.</th>
                      <th className="p-3 font-medium">Nama Pegawai</th>
                      <th className="p-3 font-medium">NIP/NIK/NRG</th>
                      <th className="p-3 font-medium">Tempat, Tgl Lahir</th>
                      <th className="p-3 font-medium">Tahun Masuk</th>
                      <th className="p-3 font-medium">Alamat</th>
                      <th className="p-3 font-medium">Email / No. Tlp</th>
                      <th className="p-3 font-medium text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-200">
                    {pegawaiList.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="p-3 text-slate-600 text-center">{p.no}</td>
                        <td className="p-3 font-medium text-slate-800">{p.nama}</td>
                        <td className="p-3 text-slate-600">{p.nip}</td>
                        <td className="p-3 text-slate-600">{p.ttl}</td>
                        <td className="p-3 text-slate-600">{p.tahunMasuk || '-'}</td>
                        <td className="p-3 text-slate-600 truncate max-w-[150px]" title={p.alamat}>{p.alamat}</td>
                        <td className="p-3 text-slate-600">{p.kontak}</td>
                        <td className="p-3 text-center space-x-2">
                          <button 
                            onClick={() => handleOpenEditPegawai(p)}
                            className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors" 
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeletePegawai(p)}
                            className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 transition-colors" 
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'tugas' && (
            <div>
               <div className="flex justify-between items-center mb-4">
                <input 
                  type="text" 
                  placeholder="Cari tugas..." 
                  className="px-4 py-2 border border-slate-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button 
                  onClick={handleOpenAddTugas}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                >
                  <Plus size={18} /> Tambah Tugas
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-max text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                      <th className="p-3 font-medium w-16 text-center">No.</th>
                      <th className="p-3 font-medium">Nama Tugas Tambahan</th>
                      <th className="p-3 font-medium">Tunjangan (Rp)</th>
                      <th className="p-3 font-medium text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-200">
                    {tugasList.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="p-3 text-slate-600 text-center">{t.no}</td>
                        <td className="p-3 font-medium text-slate-800">{t.nama}</td>
                        <td className="p-3 text-slate-600">
                          {t.nominal ? `Rp ${Number(t.nominal).toLocaleString('id-ID')}` : 'Rp 0'}
                        </td>
                        <td className="p-3 text-center space-x-2">
                          <button 
                            onClick={() => handleOpenEditTugas(t)}
                            className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors" 
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteTugas(t)}
                            className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 transition-colors" 
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pegawai Modal */}
      {showPegawaiModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">{editingPegawaiId !== null ? 'Edit Pegawai' : 'Tambah Pegawai Baru'}</h3>
              <button onClick={() => setShowPegawaiModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddPegawai} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nama Pegawai</label>
                  <input required type="text" value={newPegawai.nama} onChange={e => setNewPegawai({...newPegawai, nama: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">NIP/NIK/NRG</label>
                  <input required type="text" value={newPegawai.nip} onChange={e => setNewPegawai({...newPegawai, nip: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tempat, Tgl Lahir</label>
                  <input required type="text" value={newPegawai.ttl} onChange={e => setNewPegawai({...newPegawai, ttl: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Contoh: Jakarta, 12 Feb 1985" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tahun Masuk</label>
                  <input type="number" value={newPegawai.tahunMasuk} onChange={e => setNewPegawai({...newPegawai, tahunMasuk: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Contoh: 2015" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email / No. Tlp</label>
                  <input required type="text" value={newPegawai.kontak} onChange={e => setNewPegawai({...newPegawai, kontak: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Alamat</label>
                  <textarea required value={newPegawai.alamat} onChange={e => setNewPegawai({...newPegawai, alamat: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={2}></textarea>
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t border-slate-200 mt-6">
                <button type="button" onClick={() => setShowPegawaiModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg mr-2 transition-colors">
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors">
                  Simpan Pegawai
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tugas Modal */}
      {showTugasModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">{editingTugasId !== null ? 'Edit Tugas Tambahan' : 'Tambah Tugas Tambahan'}</h3>
              <button onClick={() => setShowTugasModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddTugas} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Tugas Tambahan</label>
                <input required type="text" value={newTugas.nama} onChange={e => setNewTugas({...newTugas, nama: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tunjangan (Rp)</label>
                <input required type="text" value={newTugas.nominal} onChange={e => setNewTugas({...newTugas, nominal: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Contoh: 250.000" />
              </div>
              <div className="flex justify-end pt-4 border-t border-slate-200 mt-6">
                <button type="button" onClick={() => setShowTugasModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg mr-2 transition-colors">
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors">
                  Simpan Tugas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Pegawai Modal */}
      {showDeletePegawaiModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Hapus Pegawai</h3>
              <p className="text-slate-600">Apakah Anda yakin ingin menghapus pegawai <strong>{pegawaiToDelete?.nama}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
            </div>
            <div className="flex justify-end p-4 border-t border-slate-200 bg-slate-50">
              <button 
                onClick={() => {
                  setShowDeletePegawaiModal(false);
                  setPegawaiToDelete(null);
                }} 
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg mr-2 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={confirmDeletePegawai} 
                className="px-4 py-2 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Tugas Modal */}
      {showDeleteTugasModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Hapus Tugas Tambahan</h3>
              <p className="text-slate-600">Apakah Anda yakin ingin menghapus tugas tambahan <strong>{tugasToDelete?.nama}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
            </div>
            <div className="flex justify-end p-4 border-t border-slate-200 bg-slate-50">
              <button 
                onClick={() => {
                  setShowDeleteTugasModal(false);
                  setTugasToDelete(null);
                }} 
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg mr-2 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={confirmDeleteTugas} 
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
