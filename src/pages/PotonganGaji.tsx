import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Edit2, Trash2, X, Save } from 'lucide-react';

const BULAN_LIST = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function PotonganGaji() {
  const [pegawaiList, setPegawaiList] = useState<any[]>([]);
  const [gajiBulanan, setGajiBulanan] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTahun, setSelectedTahun] = useState(new Date().getFullYear().toString());

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedPegawai, setSelectedPegawai] = useState<any>(null);
  const [potonganData, setPotonganData] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingPegawaiId, setDeletingPegawaiId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [selectedTahun]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch pegawai
      const { data: pegawaiData, error: pegawaiError } = await supabase
        .from('pegawai')
        .select('id, nama')
        .order('created_at', { ascending: true });
      
      if (pegawaiError) throw pegawaiError;
      setPegawaiList(pegawaiData || []);

      // Fetch gaji_bulanan for selected year
      const { data: gajiData, error: gajiError } = await supabase
        .from('gaji_bulanan')
        .select('id, pegawai_id, bulan, potongan, gaji_bersih')
        .eq('tahun', selectedTahun);
      
      if (gajiError) throw gajiError;
      setGajiBulanan(gajiData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (pegawai: any) => {
    setSelectedPegawai(pegawai);
    
    // Initialize potongan data for the selected employee
    const initialData: Record<string, number> = {};
    BULAN_LIST.forEach(bulan => {
      const gaji = gajiBulanan.find(g => g.pegawai_id === pegawai.id && g.bulan === bulan);
      initialData[bulan] = gaji?.potongan || 0;
    });
    
    setPotonganData(initialData);
    setShowModal(true);
  };

  const handlePotonganChange = (bulan: string, value: string) => {
    const numValue = parseFloat(value.replace(/\./g, '')) || 0;
    setPotonganData(prev => ({
      ...prev,
      [bulan]: numValue
    }));
  };

  const handleSave = async () => {
    if (!selectedPegawai) return;
    setIsSaving(true);
    
    try {
      for (const bulan of BULAN_LIST) {
        const potongan = potonganData[bulan] || 0;
        const existingGaji = gajiBulanan.find(g => g.pegawai_id === selectedPegawai.id && g.bulan === bulan);
        
        if (existingGaji) {
          // Fetch the full record to recalculate gaji_bersih
          const { data: fullRecord, error: fetchError } = await supabase
            .from('gaji_bulanan')
            .select('*')
            .eq('id', existingGaji.id)
            .single();
            
          if (fetchError) throw fetchError;
          
          if (fullRecord) {
            // Recalculate gaji_bersih
            // gaji_bersih = (gaji pokok) + total_insentif + nominal_tugas_tambahan - potongan
            // Since we don't have gaji_pokok in gaji_bulanan, we calculate it from the previous gaji_bersih
            // previous_gaji_bersih = base_income - previous_potongan
            // base_income = previous_gaji_bersih + previous_potongan
            // new_gaji_bersih = base_income - new_potongan
            
            const baseIncome = Number(fullRecord.gaji_bersih) + Number(fullRecord.potongan);
            const newGajiBersih = baseIncome - potongan;
            
            await supabase
              .from('gaji_bulanan')
              .update({ 
                potongan: potongan,
                gaji_bersih: newGajiBersih
              })
              .eq('id', existingGaji.id);
          }
        } else if (potongan > 0) {
          // Create new record just for potongan if it doesn't exist and potongan > 0
          await supabase
            .from('gaji_bulanan')
            .insert({
              pegawai_id: selectedPegawai.id,
              bulan: bulan,
              tahun: selectedTahun,
              potongan: potongan,
              gaji_bersih: -potongan // Negative if no other income
            });
        }
      }
      
      setShowModal(false);
      setSuccessMsg('Data potongan berhasil disimpan.');
      setTimeout(() => setSuccessMsg(null), 5000);
      fetchData();
    } catch (error) {
      console.error('Error saving potongan:', error);
      setErrorMsg('Gagal menyimpan data potongan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPegawaiId) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    
    try {
      // Get all gaji records for this employee in the selected year
      const recordsToUpdate = gajiBulanan.filter(g => g.pegawai_id === deletingPegawaiId && g.potongan > 0);
      
      for (const record of recordsToUpdate) {
        await supabase
          .from('gaji_bulanan')
          .update({ potongan: 0 })
          .eq('id', record.id);
      }
      
      setSuccessMsg('Data potongan berhasil dihapus.');
      setTimeout(() => setSuccessMsg(null), 5000);
      fetchData();
    } catch (error) {
      console.error('Error deleting potongan:', error);
      setErrorMsg('Gagal menghapus data potongan.');
    } finally {
      setShowDeleteModal(false);
      setDeletingPegawaiId(null);
    }
  };

  const confirmDelete = (pegawaiId: string) => {
    setDeletingPegawaiId(pegawaiId);
    setShowDeleteModal(true);
  };

  // Prepare table data
  const tableData = pegawaiList.map(pegawai => {
    const rowData: any = {
      id: pegawai.id,
      nama: pegawai.nama,
      total: 0
    };
    
    BULAN_LIST.forEach(bulan => {
      const gaji = gajiBulanan.find(g => g.pegawai_id === pegawai.id && g.bulan === bulan);
      const potongan = gaji?.potongan || 0;
      rowData[bulan] = potongan;
      rowData.total += potongan;
    });
    
    return rowData;
  });

  return (
    <div className="space-y-6">
      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Konfirmasi Hapus</h3>
            </div>
            
            <div className="p-6">
              <p className="text-slate-600">
                Apakah Anda yakin ingin menghapus semua potongan untuk pegawai ini di tahun terpilih?
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Data yang dihapus tidak dapat dikembalikan.
              </p>
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingPegawaiId(null);
                }}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-rose-600 text-white font-medium rounded-lg hover:bg-rose-700 transition-colors"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Potongan Gaji</h2>
          <p className="text-slate-500">Kelola potongan gaji per pegawai untuk tahun {selectedTahun}.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Data Potongan Pegawai</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="p-4 font-medium border-r border-slate-200 text-center">No.</th>
                <th className="p-4 font-medium border-r border-slate-200">Nama Pegawai</th>
                {BULAN_LIST.map(bulan => (
                  <th key={bulan} className="p-4 font-medium border-r border-slate-200 text-right">{bulan.substring(0, 3)}</th>
                ))}
                <th className="p-4 font-medium border-r border-slate-200 text-right">Total Potongan</th>
                <th className="p-4 font-medium text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={16} className="p-8 text-center text-slate-500">Memuat data...</td>
                </tr>
              ) : tableData.length === 0 ? (
                <tr>
                  <td colSpan={16} className="p-8 text-center text-slate-500">Tidak ada data ditemukan.</td>
                </tr>
              ) : (
                tableData.map((row, index) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="p-4 text-center border-r border-slate-200 text-slate-600">{index + 1}</td>
                    <td className="p-4 font-medium text-slate-800 border-r border-slate-200">{row.nama}</td>
                    {BULAN_LIST.map(bulan => (
                      <td key={bulan} className="p-4 text-right border-r border-slate-200 text-slate-600">
                        {row[bulan] > 0 ? row[bulan].toLocaleString('id-ID') : '-'}
                      </td>
                    ))}
                    <td className="p-4 font-bold text-rose-600 text-right border-r border-slate-200">
                      {row.total > 0 ? row.total.toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="p-4 text-center space-x-2">
                      <button 
                        onClick={() => handleEdit(row)}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors" 
                        title="Edit Potongan"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => confirmDelete(row.id)}
                        className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 transition-colors" 
                        title="Hapus Semua Potongan"
                        disabled={row.total === 0}
                      >
                        <Trash2 size={18} className={row.total === 0 ? 'opacity-50' : ''} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Edit Potongan */}
      {showModal && selectedPegawai && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Edit Potongan Gaji</h3>
                <p className="text-sm text-slate-500">{selectedPegawai.nama} - Tahun {selectedTahun}</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {BULAN_LIST.map(bulan => (
                  <div key={bulan} className="space-y-1">
                    <label className="block text-sm font-medium text-slate-700">{bulan}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">Rp</span>
                      <input 
                        type="text" 
                        value={potonganData[bulan] ? potonganData[bulan].toLocaleString('id-ID') : ''}
                        onChange={(e) => handlePotonganChange(bulan, e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                        placeholder="0"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3 shrink-0 bg-slate-50">
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={18} />
                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

