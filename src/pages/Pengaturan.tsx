import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Shield, User, CheckCircle2, Loader2, Edit2, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Toast, ToastType } from '../components/Toast';

interface PengaturanProps {
  tahunAnggaran?: string;
  setTahunAnggaran?: (tahun: string) => void;
  setSubPath?: (path: string) => void;
}

interface Admin {
  id: string;
  nama: string;
  email: string;
  username?: string;
  password?: string;
  role: string;
  status: string;
}

export function Pengaturan({ tahunAnggaran = '2026', setTahunAnggaran, setSubPath }: PengaturanProps) {
  const [activeTab, setActiveTab] = useState<'umum' | 'admin'>('umum');
  const [localTahunAnggaran, setLocalTahunAnggaran] = useState(tahunAnggaran);
  const [logoUrl, setLogoUrl] = useState('');
  const [backupOtomatis, setBackupOtomatis] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [pengaturanId, setPengaturanId] = useState<string | null>(null);

  const [adminList, setAdminList] = useState<Admin[]>([]);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [adminForm, setAdminForm] = useState<Partial<Admin>>({});
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (setSubPath) {
      if (activeTab === 'umum') setSubPath('Umum');
      else if (activeTab === 'admin') setSubPath('Administrator');
    }
  }, [activeTab, setSubPath]);

  useEffect(() => {
    fetchPengaturan();
    fetchAdminList();

    const adminSubscription = supabase
      .channel('admin_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin' }, () => {
        fetchAdminList();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(adminSubscription);
    };
  }, []);

  const fetchAdminList = async () => {
    setIsLoadingAdmin(true);
    try {
      const { data, error } = await supabase
        .from('admin')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      if (data) setAdminList(data);
    } catch (error) {
      console.error('Error fetching admin list:', error);
      showToast('Gagal memuat daftar admin', 'error');
    } finally {
      setIsLoadingAdmin(false);
    }
  };

  const handleOpenAddAdmin = () => {
    setEditingAdmin(null);
    setAdminForm({ nama: '', email: '', username: '', password: '', role: 'Admin Keuangan', status: 'Aktif' });
    setIsModalOpen(true);
  };

  const handleOpenEditAdmin = (admin: Admin) => {
    setEditingAdmin(admin);
    setAdminForm(admin);
    setIsModalOpen(true);
  };

  const handleDeleteAdmin = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus admin ini?')) return;
    
    try {
      const { error } = await supabase
        .from('admin')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      showToast('Admin berhasil dihapus', 'success');
      fetchAdminList();
    } catch (error) {
      console.error('Error deleting admin:', error);
      showToast('Gagal menghapus admin', 'error');
    }
  };

  const handleSaveAdmin = async () => {
    if (!adminForm.nama || !adminForm.email || !adminForm.username) {
      showToast('Nama, Email, dan Username harus diisi', 'error');
      return;
    }
    if (!editingAdmin && !adminForm.password) {
      showToast('Sandi harus diisi untuk admin baru', 'error');
      return;
    }

    setIsSavingAdmin(true);
    try {
      if (editingAdmin) {
        const updateData: any = {
          nama: adminForm.nama,
          email: adminForm.email,
          username: adminForm.username,
          role: adminForm.role,
          status: adminForm.status,
          updated_at: new Date().toISOString()
        };
        if (adminForm.password) {
          updateData.password = adminForm.password;
        }

        const { error } = await supabase
          .from('admin')
          .update(updateData)
          .eq('id', editingAdmin.id);
          
        if (error) throw error;
        showToast('Admin berhasil diperbarui', 'success');
      } else {
        const { error } = await supabase
          .from('admin')
          .insert([{
            nama: adminForm.nama,
            email: adminForm.email,
            username: adminForm.username,
            password: adminForm.password,
            role: adminForm.role || 'Admin Keuangan',
            status: adminForm.status || 'Aktif'
          }]);
          
        if (error) throw error;
        showToast('Admin berhasil ditambahkan', 'success');
      }
      setIsModalOpen(false);
      fetchAdminList();
    } catch (error: any) {
      console.error('Error saving admin:', error);
      showToast(error.message || 'Gagal menyimpan admin', 'error');
    } finally {
      setIsSavingAdmin(false);
    }
  };

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
      showToast('Pengaturan berhasil disimpan', 'success');
      
      setTimeout(() => {
        setIsSaved(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving pengaturan:', error);
      showToast('Gagal menyimpan pengaturan. Pastikan tabel pengaturan sudah dibuat.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
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
                  <select 
                    value={localTahunAnggaran}
                    onChange={(e) => setLocalTahunAnggaran(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="2026">2026</option>
                  </select>
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
                <button 
                  onClick={handleOpenAddAdmin}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors text-sm"
                >
                  + Tambah Admin
                </button>
              </div>
              
              <div className="space-y-4">
                {isLoadingAdmin ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-emerald-600" size={24} />
                  </div>
                ) : adminList.length > 0 ? (
                  adminList.map((admin) => (
                    <div key={admin.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-emerald-300 transition-colors">
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
                          <p className={`text-xs ${admin.status === 'Aktif' ? 'text-emerald-600' : 'text-rose-600'}`}>{admin.status}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleOpenEditAdmin(admin)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteAdmin(admin.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500 border border-dashed border-slate-300 rounded-lg">
                    Belum ada data administrator.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Tambah/Edit Admin */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-200">
              <h3 className="font-bold text-lg text-slate-800">
                {editingAdmin ? 'Edit Administrator' : 'Tambah Administrator'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                <input 
                  type="text" 
                  value={adminForm.nama || ''}
                  onChange={(e) => setAdminForm({...adminForm, nama: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Nama Lengkap"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input 
                  type="email" 
                  value={adminForm.email || ''}
                  onChange={(e) => setAdminForm({...adminForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="email@sekolah.sch.id"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <input 
                  type="text" 
                  value={adminForm.username || ''}
                  onChange={(e) => setAdminForm({...adminForm, username: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Username untuk login"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Sandi {editingAdmin && <span className="text-xs text-slate-400 font-normal">(Kosongkan jika tidak ingin mengubah)</span>}
                </label>
                <input 
                  type="password" 
                  value={adminForm.password || ''}
                  onChange={(e) => setAdminForm({...adminForm, password: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Sandi login"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select 
                  value={adminForm.role || 'Admin Keuangan'}
                  onChange={(e) => setAdminForm({...adminForm, role: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Super Admin">Super Admin</option>
                  <option value="Admin Keuangan">Admin Keuangan</option>
                  <option value="Kepala Sekolah">Kepala Sekolah</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select 
                  value={adminForm.status || 'Aktif'}
                  onChange={(e) => setAdminForm({...adminForm, status: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleSaveAdmin}
                disabled={isSavingAdmin}
                className="px-4 py-2 bg-emerald-600 text-white font-medium hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-70 flex items-center gap-2"
              >
                {isSavingAdmin ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}
