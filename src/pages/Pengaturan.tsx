import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Shield, User, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PengaturanProps {
  tahunAnggaran?: string;
  setTahunAnggaran?: (tahun: string) => void;
}

export function Pengaturan({ tahunAnggaran = '2026', setTahunAnggaran }: PengaturanProps) {
  const [activeTab, setActiveTab] = useState<'umum' | 'admin'>('umum');
  const [localTahunAnggaran, setLocalTahunAnggaran] = useState(tahunAnggaran);
  const [logoUrl, setLogoUrl] = useState('');
  const [backupOtomatis, setBackupOtomatis] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [pengaturanId, setPengaturanId] = useState<string | null>(null);

  useEffect(() => {
    fetchPengaturan();
  }, []);

  const fetchPengaturan = async () => {
    try {
      const { data, error } = await supabase
        .from('pengaturan')
        .select('*')
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setPengaturanId(data.id);
        setLocalTahunAnggaran(data.tahun_anggaran || '2026');
        setLogoUrl(data.logo_url || '');
        setBackupOtomatis(data.backup_otomatis !== false);
        if (setTahunAnggaran && data.tahun_anggaran) {
          setTahunAnggaran(data.tahun_anggaran);
        }
      }
    } catch (error) {
      console.error('Error fetching pengaturan:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setIsSaved(false);
    
    try {
      const payload = {
        tahun_anggaran: localTahunAnggaran,
        logo_url: logoUrl,
        backup_otomatis: backupOtomatis
      };

      if (pengaturanId) {
        const { error } = await supabase
          .from('pengaturan')
          .update(payload)
          .eq('id', pengaturanId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('pengaturan')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        if (data) setPengaturanId(data.id);
      }

      if (setTahunAnggaran) {
        setTahunAnggaran(localTahunAnggaran);
      }
      setIsSaved(true);
      
      setTimeout(() => {
        setIsSaved(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving pengaturan:', error);
      alert('Gagal menyimpan pengaturan. Pastikan tabel pengaturan sudah dibuat.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Pengaturan</h2>
        <p className="text-slate-500">Konfigurasi sistem dan manajemen pengguna admin.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-4">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('umum')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                activeTab === 'umum'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <SettingsIcon size={18} />
              Pengaturan Umum
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                activeTab === 'admin'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Shield size={18} />
              Manajemen Admin
            </button>
          </nav>
        </div>

        <div className="flex-1 p-6">
          {activeTab === 'umum' && (
            <div className="max-w-2xl space-y-6">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">Pengaturan Sistem</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tahun Anggaran</label>
                  <input 
                    type="text" 
                    value={localTahunAnggaran}
                    onChange={(e) => setLocalTahunAnggaran(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                    placeholder="Contoh: 2026" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">URL Logo Slip</label>
                  <input 
                    type="text" 
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                    placeholder="https://contoh.com/logo.png" 
                  />
                  {logoUrl && (
                    <div className="mt-2 p-2 border border-slate-200 rounded-lg bg-slate-50 inline-block">
                      <p className="text-xs text-slate-500 mb-1">Pratinjau Logo:</p>
                      <img 
                        src={logoUrl} 
                        alt="Preview Logo" 
                        className="h-16 object-contain"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Logo+Tidak+Valid';
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div>
                    <p className="font-medium text-slate-800">Backup Database Otomatis</p>
                    <p className="text-sm text-slate-500">Lakukan backup data setiap akhir bulan.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={backupOtomatis} onChange={(e) => setBackupOtomatis(e.target.checked)} />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              <div className="pt-6 flex items-center gap-4">
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan Pengaturan'
                  )}
                </button>
                {isSaved && (
                  <span className="text-sm font-medium text-emerald-600 flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 duration-300">
                    <CheckCircle2 size={18} />
                    Pengaturan berhasil disimpan!
                  </span>
                )}
              </div>
            </div>
          )}

          {activeTab === 'admin' && (
            <div>
              <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-2">
                <h3 className="text-lg font-bold text-slate-800">Daftar Administrator</h3>
                <button className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors text-sm">
                  + Tambah Admin
                </button>
              </div>
              
              <div className="space-y-4">
                {[
                  { nama: 'Budi Santoso', email: 'budi@sekolah.sch.id', role: 'Super Admin', status: 'Aktif' },
                  { nama: 'Siti Aminah', email: 'siti.keuangan@sekolah.sch.id', role: 'Admin Keuangan', status: 'Aktif' },
                ].map((admin, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-emerald-300 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{admin.nama}</p>
                        <p className="text-sm text-slate-500">{admin.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-800">{admin.role}</p>
                        <p className="text-xs text-emerald-600">{admin.status}</p>
                      </div>
                      <button className="text-slate-400 hover:text-blue-600 font-medium text-sm">Edit</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
