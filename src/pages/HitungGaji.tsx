import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, X, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function HitungGaji() {
  const [pegawaiList, setPegawaiList] = useState<any[]>([]);
  const [combinedData, setCombinedData] = useState<any[]>([]);
  const [tugasTambahanList, setTugasTambahanList] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedBulan, setSelectedBulan] = useState('Semua Bulan');
  const [selectedTahun, setSelectedTahun] = useState(new Date().getFullYear().toString());
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showUnapproveModal, setShowUnapproveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingRowId, setDeletingRowId] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingData, setEditingData] = useState<any>(null);
  const [formData, setFormData] = useState({
    pegawai_id: '',
    nama_pegawai: '',
    jml_hadir: '',
    nominal_insentif: '3.000',
    total_insentif: '',
    tugas_tambahan_ids: [] as string[],
    nominal_tugas_tambahan: '',
    potongan: '',
    gaji_bersih: '',
    gaji_pokok: 0
  });

  const bulanList = [
    'Semua Bulan', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  useEffect(() => {
    fetchData();
  }, [selectedBulan]);

  const fetchData = async () => {
    setIsLoading(true);
    setDbError(null);
    try {
      // Fetch Pegawai
      const { data: pegawaiData, error: pegawaiError } = await supabase
        .from('pegawai')
        .select('id, nama')
        .order('created_at', { ascending: true });
      if (pegawaiError) console.error('Pegawai error:', pegawaiError);
      setPegawaiList(pegawaiData || []);

      // Fetch Gaji Pokok
      const { data: gajiPokokData, error: gajiPokokError } = await supabase
        .from('gaji_pegawai')
        .select('pegawai_id, total_gaji_pokok');
      if (gajiPokokError) console.error('Gaji Pokok error:', gajiPokokError);
      const gajiPokokList = gajiPokokData || [];

      // Fetch Tugas Tambahan
      const { data: tugasData, error: tugasError } = await supabase
        .from('tugas_tambahan')
        .select('id, nama_tugas, nominal');
      if (tugasError) console.error('Tugas Tambahan error:', tugasError);
      setTugasTambahanList(tugasData || []);

      // Fetch Gaji Bulanan
      let gajiBulananList: any[] = [];
      let query = supabase
        .from('gaji_bulanan')
        .select('*, is_approved')
        .eq('tahun', selectedTahun);
        
      if (selectedBulan !== 'Semua Bulan') {
        query = query.eq('bulan', selectedBulan);
      }
      
      const { data: bulananData, error: bulananError } = await query;
      
      if (bulananError) {
        console.error('Gaji Bulanan error:', bulananError);
        if (bulananError.code === '42P01') {
          setDbError('Tabel gaji_bulanan belum dibuat. Silakan jalankan script SQL yang disediakan saat menyimpan.');
        } else if (bulananError.message?.includes('is_approved') || bulananError.code === '42703') {
          setDbError('Kolom is_approved belum terdeteksi. Silakan jalankan script SQL perbaikan di Supabase SQL Editor, lalu jalankan perintah: NOTIFY pgrst, \'reload schema\';');
        }
      } else {
        gajiBulananList = bulananData || [];
      }

      // Combine data
      if (pegawaiData) {
        if (selectedBulan === 'Semua Bulan') {
          const combined = gajiBulananList.map(gb => {
            const p = pegawaiData.find(x => x.id === gb.pegawai_id);
            const gp = gajiPokokList.find(g => g.pegawai_id === gb.pegawai_id);
            
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

            const namaTugasStr = namaTugasList.length > 0 ? namaTugasList.join(', ') : '-';
            
            const gajiPokok = gp?.total_gaji_pokok || 0;
            const jmlHadir = gb?.jml_hadir || 0;
            const nominalInsentif = gb?.nominal_insentif || 3000;
            const totalInsentif = gb?.total_insentif || (jmlHadir * nominalInsentif);
            const nominalTugas = gb?.nominal_tugas_tambahan || 0;
            const potongan = gb?.potongan || 0;
            const gajiBersih = gb?.gaji_bersih || (gajiPokok + totalInsentif + nominalTugas - potongan);

            const isApproved = gb?.is_approved === true || gb?.is_approved === 'true' || gb?.is_approved === 'TRUE' || gb?.is_approved === 1;

            return {
              id: gb.id, // Use gaji_bulanan id as unique key for the row
              pegawai_id: gb.pegawai_id,
              nama: p ? p.nama : '-',
              bulan: gb.bulan,
              gaji_pokok: gajiPokok,
              jml_hadir: jmlHadir,
              nominal_insentif: nominalInsentif,
              total_insentif: totalInsentif,
              tugas_tambahan_ids: tugasIds,
              nama_tugas: namaTugasStr,
              nominal_tugas_tambahan: nominalTugas,
              potongan: potongan,
              gaji_bersih: gajiBersih,
              status: isApproved ? 'Approved' : 'Belum Approve',
              is_approved: isApproved,
              gaji_bulanan_id: gb.id
            };
          });
          
          // Sort by name then month
          combined.sort((a, b) => {
            if (a.nama < b.nama) return -1;
            if (a.nama > b.nama) return 1;
            return 0;
          });
          
          setCombinedData(combined);
        } else {
          const combined = pegawaiData.map(p => {
            const gp = gajiPokokList.find(g => g.pegawai_id === p.id);
            const gb = gajiBulananList.find(g => g.pegawai_id === p.id);
            
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

            const namaTugasStr = namaTugasList.length > 0 ? namaTugasList.join(', ') : '-';
            
            const gajiPokok = gp?.total_gaji_pokok || 0;
            const jmlHadir = gb?.jml_hadir || 0;
            const nominalInsentif = gb?.nominal_insentif || 3000;
            const totalInsentif = gb?.total_insentif || (jmlHadir * nominalInsentif);
            const nominalTugas = gb?.nominal_tugas_tambahan || 0;
            const potongan = gb?.potongan || 0;
            const gajiBersih = gb?.gaji_bersih || (gajiPokok + totalInsentif + nominalTugas - potongan);

            const isApproved = gb?.is_approved === true || gb?.is_approved === 'true' || gb?.is_approved === 'TRUE' || gb?.is_approved === 1;

            return {
              id: p.id,
              pegawai_id: p.id,
              nama: p.nama || '-',
              bulan: selectedBulan,
              gaji_pokok: gajiPokok,
              jml_hadir: jmlHadir,
              nominal_insentif: nominalInsentif,
              total_insentif: totalInsentif,
              tugas_tambahan_ids: tugasIds,
              nama_tugas: namaTugasStr,
              nominal_tugas_tambahan: nominalTugas,
              potongan: potongan,
              gaji_bersih: gajiBersih,
              status: gb ? (isApproved ? 'Approved' : 'Belum Approve') : 'Belum Dihitung',
              is_approved: isApproved,
              gaji_bulanan_id: gb?.id || null
            };
          });
          setCombinedData(combined);
        }
      }

    } catch (error: any) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEdit = (rowId: string) => {
    const data = combinedData.find(d => d.id === rowId);
    if (!data) return;
    if (data.is_approved) {
      setValidationError('Data yang sudah di-approve tidak dapat diubah.');
      setTimeout(() => setValidationError(null), 5000);
      return;
    }
    
    setEditingData(data);
    
    setFormData({
      pegawai_id: data.pegawai_id,
      nama_pegawai: data.nama,
      jml_hadir: data.jml_hadir ? data.jml_hadir.toString() : '',
      nominal_insentif: data.nominal_insentif ? Number(data.nominal_insentif).toLocaleString('id-ID') : '3.000',
      total_insentif: data.total_insentif ? Number(data.total_insentif).toLocaleString('id-ID') : '0',
      tugas_tambahan_ids: data.tugas_tambahan_ids && data.tugas_tambahan_ids.length > 0 ? data.tugas_tambahan_ids : [''],
      nominal_tugas_tambahan: data.nominal_tugas_tambahan ? Number(data.nominal_tugas_tambahan).toLocaleString('id-ID') : '0',
      potongan: data.potongan ? Number(data.potongan).toLocaleString('id-ID') : '',
      gaji_bersih: data.gaji_bersih ? Number(data.gaji_bersih).toLocaleString('id-ID') : '0',
      gaji_pokok: data.gaji_pokok
    });
    
    setShowEditModal(true);
  };

  const calculateTotal = (hadir: number, insentif: number, tugas: number, pot: number, gapok: number) => {
    const totalInsentif = hadir * insentif;
    const bersih = gapok + totalInsentif + tugas - pot;
    return { totalInsentif, bersih };
  };

  const handleHadirChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hadir = parseFloat(e.target.value) || 0;
    const insentif = parseFloat(String(formData.nominal_insentif).replace(/\./g, '')) || 0;
    const tugas = parseFloat(String(formData.nominal_tugas_tambahan).replace(/\./g, '')) || 0;
    const pot = parseFloat(String(formData.potongan).replace(/\./g, '')) || 0;
    
    const { totalInsentif, bersih } = calculateTotal(hadir, insentif, tugas, pot, formData.gaji_pokok);
    
    setFormData(prev => ({
      ...prev,
      jml_hadir: e.target.value,
      total_insentif: totalInsentif ? totalInsentif.toLocaleString('id-ID') : '0',
      gaji_bersih: bersih ? bersih.toLocaleString('id-ID') : '0'
    }));
  };

  const handleInsentifChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    const insentif = parseFloat(val) || 0;
    const hadir = parseFloat(formData.jml_hadir) || 0;
    const tugas = parseFloat(String(formData.nominal_tugas_tambahan).replace(/\./g, '')) || 0;
    const pot = parseFloat(String(formData.potongan).replace(/\./g, '')) || 0;
    
    const { totalInsentif, bersih } = calculateTotal(hadir, insentif, tugas, pot, formData.gaji_pokok);
    
    setFormData(prev => ({
      ...prev,
      nominal_insentif: val ? Number(val).toLocaleString('id-ID') : '',
      total_insentif: totalInsentif ? totalInsentif.toLocaleString('id-ID') : '0',
      gaji_bersih: bersih ? bersih.toLocaleString('id-ID') : '0'
    }));
  };

  const handleTugasChange = (index: number, value: string) => {
    const newTugasIds = [...formData.tugas_tambahan_ids];
    newTugasIds[index] = value;
    
    // Calculate total nominal tugas
    const totalNominalTugas = newTugasIds.reduce((sum, id) => {
      const tugas = tugasTambahanList.find(t => t.id === id);
      return sum + (tugas ? parseFloat(tugas.nominal) || 0 : 0);
    }, 0);

    const hadir = parseFloat(formData.jml_hadir) || 0;
    const insentif = parseFloat(String(formData.nominal_insentif).replace(/\./g, '')) || 0;
    const pot = parseFloat(String(formData.potongan).replace(/\./g, '')) || 0;
    
    const { totalInsentif, bersih } = calculateTotal(hadir, insentif, totalNominalTugas, pot, formData.gaji_pokok);
    
    setFormData(prev => ({
      ...prev,
      tugas_tambahan_ids: newTugasIds,
      nominal_tugas_tambahan: totalNominalTugas ? totalNominalTugas.toLocaleString('id-ID') : '0',
      gaji_bersih: bersih ? bersih.toLocaleString('id-ID') : '0'
    }));
  };

  const addTugasDropdown = () => {
    setFormData(prev => ({
      ...prev,
      tugas_tambahan_ids: [...prev.tugas_tambahan_ids, '']
    }));
  };

  const removeTugasDropdown = (index: number) => {
    const newTugasIds = [...formData.tugas_tambahan_ids];
    newTugasIds.splice(index, 1);
    
    if (newTugasIds.length === 0) {
      newTugasIds.push('');
    }

    const totalNominalTugas = newTugasIds.reduce((sum, id) => {
      const tugas = tugasTambahanList.find(t => t.id === id);
      return sum + (tugas ? parseFloat(tugas.nominal) || 0 : 0);
    }, 0);

    const hadir = parseFloat(formData.jml_hadir) || 0;
    const insentif = parseFloat(String(formData.nominal_insentif).replace(/\./g, '')) || 0;
    const pot = parseFloat(String(formData.potongan).replace(/\./g, '')) || 0;
    
    const { totalInsentif, bersih } = calculateTotal(hadir, insentif, totalNominalTugas, pot, formData.gaji_pokok);
    
    setFormData(prev => ({
      ...prev,
      tugas_tambahan_ids: newTugasIds,
      nominal_tugas_tambahan: totalNominalTugas ? totalNominalTugas.toLocaleString('id-ID') : '0',
      gaji_bersih: bersih ? bersih.toLocaleString('id-ID') : '0'
    }));
  };

  const handlePotonganChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    const pot = parseFloat(val) || 0;
    
    const hadir = parseFloat(formData.jml_hadir) || 0;
    const insentif = parseFloat(String(formData.nominal_insentif).replace(/\./g, '')) || 0;
    const tugas = parseFloat(String(formData.nominal_tugas_tambahan).replace(/\./g, '')) || 0;
    
    const { totalInsentif, bersih } = calculateTotal(hadir, insentif, tugas, pot, formData.gaji_pokok);
    
    setFormData(prev => ({
      ...prev,
      potongan: val ? Number(val).toLocaleString('id-ID') : '',
      gaji_bersih: bersih ? bersih.toLocaleString('id-ID') : '0'
    }));
  };

  const handleSaveGaji = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validTugasIds = formData.tugas_tambahan_ids.filter(id => id !== '');
      const firstTugasId = validTugasIds.length > 0 ? validTugasIds[0] : null;

      const payload = {
        pegawai_id: formData.pegawai_id,
        bulan: editingData?.bulan || selectedBulan,
        tahun: selectedTahun,
        jml_hadir: parseFloat(formData.jml_hadir) || 0,
        nominal_insentif: parseFloat(String(formData.nominal_insentif).replace(/\./g, '')) || 0,
        total_insentif: parseFloat(String(formData.total_insentif).replace(/\./g, '')) || 0,
        tugas_tambahan_id: firstTugasId,
        tugas_tambahan_ids: validTugasIds,
        nominal_tugas_tambahan: parseFloat(String(formData.nominal_tugas_tambahan).replace(/\./g, '')) || 0,
        potongan: parseFloat(String(formData.potongan).replace(/\./g, '')) || 0,
        gaji_bersih: parseFloat(String(formData.gaji_bersih).replace(/\./g, '')) || 0,
      };

      if (editingData?.gaji_bulanan_id) {
        const { error } = await supabase
          .from('gaji_bulanan')
          .update(payload)
          .eq('id', editingData.gaji_bulanan_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('gaji_bulanan')
          .insert([payload]);
        if (error) throw error;
      }

      setShowEditModal(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving gaji bulanan:', error);
      if (error.message?.includes('tugas_tambahan_ids')) {
        setDbError('Kolom tugas_tambahan_ids belum ada di tabel gaji_bulanan. Silakan jalankan script SQL berikut di Supabase SQL Editor:\n\nALTER TABLE public.gaji_bulanan ADD COLUMN IF NOT EXISTS tugas_tambahan_ids JSONB DEFAULT \'[]\'::jsonb;');
      } else if (error.message?.includes('gaji_bulanan') || error.code === '42P01') {
        setDbError('Tabel gaji_bulanan belum ada di database. Silakan jalankan script SQL berikut:\n\nCREATE TABLE public.gaji_bulanan (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  pegawai_id UUID REFERENCES public.pegawai(id) ON DELETE CASCADE,\n  bulan VARCHAR(20) NOT NULL,\n  tahun VARCHAR(4) NOT NULL,\n  jml_hadir NUMERIC DEFAULT 0,\n  nominal_insentif NUMERIC DEFAULT 3000,\n  total_insentif NUMERIC DEFAULT 0,\n  tugas_tambahan_id UUID REFERENCES public.tugas_tambahan(id) ON DELETE SET NULL,\n  tugas_tambahan_ids JSONB DEFAULT \'[]\'::jsonb,\n  nominal_tugas_tambahan NUMERIC DEFAULT 0,\n  potongan NUMERIC DEFAULT 0,\n  gaji_bersih NUMERIC DEFAULT 0,\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone(\'utc\'::text, now()) NOT NULL,\n  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone(\'utc\'::text, now()) NOT NULL,\n  UNIQUE(pegawai_id, bulan, tahun)\n);\nALTER TABLE public.gaji_bulanan ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "Enable all access" ON public.gaji_bulanan FOR ALL USING (true);');
      } else {
        setDbError(`Gagal menyimpan data gaji. Error: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const handleDelete = async () => {
    if (!deletingRowId) return;
    
    const data = combinedData.find(d => d.id === deletingRowId);
    if (!data || !data.gaji_bulanan_id) {
      setShowDeleteModal(false);
      setDeletingRowId(null);
      return;
    }
    
    try {
      const { error } = await supabase
        .from('gaji_bulanan')
        .delete()
        .eq('id', data.gaji_bulanan_id);
      
      if (error) throw error;
      setSuccessMessage(`Berhasil menghapus data gaji ${data.nama}.`);
      setTimeout(() => setSuccessMessage(null), 5000);
      fetchData();
    } catch (error: any) {
      console.error('Error deleting gaji bulanan:', error);
      setDbError(`Gagal menghapus data gaji. Error: ${error.message || 'Unknown error'}`);
    } finally {
      setShowDeleteModal(false);
      setDeletingRowId(null);
    }
  };

  const confirmDelete = (rowId: string) => {
    const data = combinedData.find(d => d.id === rowId);
    if (data?.is_approved) {
      setValidationError('Data yang sudah di-approve tidak dapat dihapus.');
      setTimeout(() => setValidationError(null), 5000);
      return;
    }
    setDeletingRowId(rowId);
    setShowDeleteModal(true);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = combinedData.map(d => d.id);
      setSelectedRows(allIds);
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const handleApproveSelected = async () => {
    if (selectedRows.length === 0) return;
    
    setShowConfirmModal(false);
    setIsProcessingAll(true);
    setDbError(null);
    setSuccessMessage(null);

    try {
      const selectedData = combinedData.filter(d => selectedRows.includes(d.id));
      
      const toUpdate = selectedData.filter(d => d.gaji_bulanan_id && !d.is_approved).map(d => d.gaji_bulanan_id);
      const toInsert = selectedData.filter(d => !d.gaji_bulanan_id);

      let totalUpdated = 0;
      let totalInserted = 0;
      const chunkSize = 30;

      if (toUpdate.length > 0) {
        for (let i = 0; i < toUpdate.length; i += chunkSize) {
          const chunk = toUpdate.slice(i, i + chunkSize);
          const { data, error } = await supabase
            .from('gaji_bulanan')
            .update({ is_approved: true })
            .in('id', chunk)
            .select();

          if (error) throw error;
          if (data) totalUpdated += data.length;
        }

        if (totalUpdated === 0) {
          throw new Error('Update tidak mengubah data apapun. Kemungkinan terhalang oleh RLS (Row Level Security) di Supabase. Silakan jalankan script SQL perbaikan.');
        }
      }

      if (toInsert.length > 0) {
        for (let i = 0; i < toInsert.length; i += chunkSize) {
          const chunk = toInsert.slice(i, i + chunkSize);
          const insertPayloads = chunk.map(data => ({
            pegawai_id: data.pegawai_id,
            bulan: data.bulan,
            tahun: selectedTahun,
            jml_hadir: data.jml_hadir || 0,
            nominal_insentif: data.nominal_insentif || 3000,
            total_insentif: data.total_insentif || 0,
            tugas_tambahan_ids: data.tugas_tambahan_ids || [],
            nominal_tugas_tambahan: data.nominal_tugas_tambahan || 0,
            potongan: data.potongan || 0,
            gaji_bersih: data.gaji_bersih || 0,
            is_approved: true
          }));

          const { data, error } = await supabase
            .from('gaji_bulanan')
            .insert(insertPayloads)
            .select();
            
          if (error) throw error;
          if (data) totalInserted += data.length;
        }

        if (totalInserted === 0) {
          throw new Error('Insert tidak berhasil menyimpan data. Kemungkinan terhalang oleh RLS (Row Level Security) di Supabase. Silakan jalankan script SQL perbaikan.');
        }
      }

      setSuccessMessage(`Berhasil meng-approve ${totalUpdated + totalInserted} data gaji.`);
      setTimeout(() => setSuccessMessage(null), 5000);
      setSelectedRows([]);
      fetchData();
    } catch (error: any) {
      console.error('Error approving gaji:', error);
      const errorMsg = error.message || JSON.stringify(error);
      
      const sqlScript = `
-- JALANKAN SCRIPT INI DI SUPABASE SQL EDITOR --

ALTER TABLE public.gaji_bulanan ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
ALTER TABLE public.gaji_bulanan ADD COLUMN IF NOT EXISTS tugas_tambahan_ids JSONB DEFAULT '[]'::jsonb;

DROP POLICY IF EXISTS "Enable all access" ON public.gaji_bulanan;
CREATE POLICY "Enable all access" ON public.gaji_bulanan FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.gaji_bulanan ENABLE ROW LEVEL SECURITY;
      `;

      if (errorMsg.includes('is_approved') || errorMsg.includes('RLS') || errorMsg.includes('policy') || errorMsg.includes('column') || errorMsg.includes('tugas_tambahan_ids')) {
        const msg = `Gagal meng-approve data.\n\nError: ${errorMsg}\n\nSilakan jalankan script SQL berikut di Supabase SQL Editor:\n${sqlScript}`;
        setDbError(msg);
      } else {
        setDbError(`Gagal meng-approve data. Error: ${errorMsg}\n\nJika error berlanjut, coba jalankan script SQL perbaikan:\n${sqlScript}`);
      }
    } finally {
      setIsProcessingAll(false);
    }
  };

  const handleUnapproveSelected = async () => {
    if (selectedRows.length === 0) return;
    
    setShowUnapproveModal(false);
    setIsProcessingAll(true);
    setDbError(null);
    setSuccessMessage(null);

    try {
      const selectedData = combinedData.filter(d => selectedRows.includes(d.id));
      
      const toUpdate = selectedData.filter(d => d.gaji_bulanan_id && d.is_approved).map(d => d.gaji_bulanan_id);

      let totalUpdated = 0;
      const chunkSize = 30;

      if (toUpdate.length > 0) {
        for (let i = 0; i < toUpdate.length; i += chunkSize) {
          const chunk = toUpdate.slice(i, i + chunkSize);
          const { data, error } = await supabase
            .from('gaji_bulanan')
            .update({ is_approved: false })
            .in('id', chunk)
            .select();

          if (error) throw error;
          if (data) totalUpdated += data.length;
        }

        if (totalUpdated === 0) {
          throw new Error('Update tidak mengubah data apapun. Kemungkinan terhalang oleh RLS (Row Level Security) di Supabase. Silakan jalankan script SQL perbaikan.');
        }
      }

      setSuccessMessage(`Berhasil membatalkan approve (unapprove) ${totalUpdated} data gaji.`);
      setTimeout(() => setSuccessMessage(null), 5000);
      setSelectedRows([]);
      fetchData();
    } catch (error: any) {
      console.error('Error unapproving gaji:', error);
      setDbError(`Gagal membatalkan approve data. Error: ${error.message || JSON.stringify(error)}`);
    } finally {
      setIsProcessingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Hitung Gaji</h2>
        <p className="text-slate-500">Proses perhitungan gaji bulanan pegawai.</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end mb-6">
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
        <div className="flex items-center gap-2 ml-auto">
          <button 
            onClick={() => {
              if (selectedRows.length === 0) {
                setValidationError('Silakan pilih minimal satu data gaji dengan mencentang kotak di sebelah kiri tabel untuk di-unapprove.');
                setTimeout(() => setValidationError(null), 5000);
                return;
              }
              const notApproved = combinedData.filter(d => selectedRows.includes(d.id) && !d.is_approved);
              if (notApproved.length > 0) {
                setValidationError('Terdapat data yang belum di-approve pada pilihan Anda. Silakan pilih data yang sudah di-approve saja untuk di-unapprove.');
                setTimeout(() => setValidationError(null), 5000);
                return;
              }
              setValidationError(null);
              setShowUnapproveModal(true);
            }}
            disabled={isProcessingAll}
            className={`px-6 py-2 text-white bg-rose-600 rounded-lg font-medium transition-colors flex items-center gap-2 ${isProcessingAll ? 'opacity-50 cursor-not-allowed' : 'hover:bg-rose-700'}`}
          >
            {isProcessingAll ? 'Memproses...' : 'Unapprove'}
          </button>
          <button 
            onClick={() => {
              if (selectedRows.length === 0) {
                setValidationError('Silakan pilih minimal satu data gaji dengan mencentang kotak di sebelah kiri tabel untuk di-approve.');
                setTimeout(() => setValidationError(null), 5000);
                return;
              }
              const alreadyApproved = combinedData.filter(d => selectedRows.includes(d.id) && d.is_approved);
              if (alreadyApproved.length > 0) {
                setValidationError('Terdapat data yang sudah di-approve pada pilihan Anda. Silakan pilih data yang belum di-approve saja.');
                setTimeout(() => setValidationError(null), 5000);
                return;
              }
              setValidationError(null);
              setShowConfirmModal(true);
            }}
            disabled={isProcessingAll}
            className={`px-6 py-2 text-white rounded-lg font-medium transition-colors flex items-center gap-2 ${isProcessingAll ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          >
            {isProcessingAll ? 'Memproses...' : 'Approve'}
          </button>
        </div>
        </div>

        {/* Unapprove Confirmation Modal */}
        {showUnapproveModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800">Konfirmasi Unapprove</h3>
              </div>
              
              <div className="p-6">
                <p className="text-slate-600">
                  Apakah Anda yakin ingin membatalkan approve (unapprove) <span className="font-bold text-slate-800">{selectedRows.length}</span> data gaji yang dipilih?
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  Data yang di-unapprove dapat diubah kembali.
                </p>
              </div>
              
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUnapproveModal(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleUnapproveSelected}
                  className="px-4 py-2 bg-rose-600 text-white font-medium rounded-lg hover:bg-rose-700 transition-colors"
                >
                  Ya, Unapprove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800">Konfirmasi Approve</h3>
              </div>
              
              <div className="p-6">
                <p className="text-slate-600">
                  Apakah Anda yakin ingin meng-approve <span className="font-bold text-slate-800">{selectedRows.length}</span> data gaji yang dipilih?
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  Data yang sudah di-approve akan masuk ke laporan dan tidak dapat diubah lagi.
                </p>
              </div>
              
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApproveSelected}
                  className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Ya, Approve
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800">Konfirmasi Hapus</h3>
              </div>
              
              <div className="p-6">
                <p className="text-slate-600">
                  Apakah Anda yakin ingin menghapus data gaji ini?
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
                    setDeletingRowId(null);
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

        {successMessage && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="text-emerald-600 mt-0.5" size={20} />
            <div>
              <h4 className="font-medium text-emerald-800">Berhasil</h4>
              <p className="text-sm text-emerald-600 mt-1">{successMessage}</p>
            </div>
          </div>
        )}

        {validationError && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-amber-600 mt-0.5" size={20} />
            <div>
              <h4 className="font-medium text-amber-800">Peringatan</h4>
              <p className="text-sm text-amber-600 mt-1">{validationError}</p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          {dbError && (
            <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-rose-600 mt-0.5" size={20} />
              <div>
                <h4 className="font-medium text-rose-800">Database Error</h4>
                <p className="text-sm text-rose-600 mt-1">{dbError}</p>
                <div className="mt-2 p-3 bg-white rounded border border-rose-100 text-xs font-mono text-slate-700 overflow-x-auto">
                  <pre>{`CREATE TABLE IF NOT EXISTS public.gaji_bulanan (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pegawai_id UUID REFERENCES public.pegawai(id) ON DELETE CASCADE,
    bulan VARCHAR(20) NOT NULL,
    tahun VARCHAR(4) NOT NULL,
    jml_hadir NUMERIC DEFAULT 0,
    nominal_insentif NUMERIC DEFAULT 3000,
    total_insentif NUMERIC DEFAULT 0,
    tugas_tambahan_id UUID REFERENCES public.tugas_tambahan(id) ON DELETE SET NULL,
    nominal_tugas_tambahan NUMERIC DEFAULT 0,
    potongan NUMERIC DEFAULT 0,
    gaji_bersih NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(pegawai_id, bulan, tahun)
);
ALTER TABLE public.gaji_bulanan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access" ON public.gaji_bulanan FOR ALL USING (true);
alter publication supabase_realtime add table public.gaji_bulanan;`}</pre>
                </div>
              </div>
            </div>
          )}
          <table className="w-full min-w-max text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                <th rowSpan={2} className="p-4 font-medium w-12 text-center border-r border-slate-200">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    checked={combinedData.length > 0 && selectedRows.length === combinedData.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th rowSpan={2} className="p-4 font-medium w-16 text-center border-r border-slate-200">No.</th>
                <th rowSpan={2} className="p-4 font-medium text-center border-r border-slate-200">Bulan</th>
                <th rowSpan={2} className="p-4 font-medium border-r border-slate-200">Nama Pegawai</th>
                <th colSpan={3} className="p-4 font-medium text-center border-r border-slate-200">Insentif Kehadiran</th>
                <th rowSpan={2} className="p-4 font-medium border-r border-slate-200 text-right">Gaji Pokok</th>
                <th colSpan={2} className="p-4 font-medium text-center border-r border-slate-200">Tugas Tambahan</th>
                <th rowSpan={2} className="p-4 font-medium border-r border-slate-200 text-right">Potongan</th>
                <th rowSpan={2} className="p-4 font-medium border-r border-slate-200 text-right">Gaji Bersih</th>
                <th rowSpan={2} className="p-4 font-medium border-r border-slate-200 text-center">Status</th>
                <th rowSpan={2} className="p-4 font-medium text-center">Aksi</th>
              </tr>
              <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                <th className="p-2 font-medium text-center border-r border-slate-200 border-t border-slate-200">Jml. Hadir</th>
                <th className="p-2 font-medium text-center border-r border-slate-200 border-t border-slate-200">Jml. Insentif</th>
                <th className="p-2 font-medium text-center border-r border-slate-200 border-t border-slate-200">Total</th>
                <th className="p-2 font-medium text-center border-r border-slate-200 border-t border-slate-200">Tugas</th>
                <th className="p-2 font-medium text-center border-r border-slate-200 border-t border-slate-200">Jumlah</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={14} className="p-8 text-center text-slate-500">
                    Memuat data...
                  </td>
                </tr>
              ) : combinedData.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-8 text-center text-slate-500">
                    Belum ada data pegawai.
                  </td>
                </tr>
              ) : (
                combinedData.map((data, i) => {
                  return (
                    <tr key={data.id} className="hover:bg-slate-50">
                      <td className="p-4 text-center border-r border-slate-200">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          checked={selectedRows.includes(data.id)}
                          onChange={() => handleSelectRow(data.id)}
                        />
                      </td>
                      <td className="p-4 text-slate-600 text-center border-r border-slate-200">{i + 1}</td>
                      <td className="p-4 text-slate-600 text-center border-r border-slate-200">{data.bulan} {selectedTahun}</td>
                      <td className="p-4 font-medium text-slate-800 border-r border-slate-200">{data.nama}</td>
                      <td className="p-4 text-slate-600 text-center border-r border-slate-200">{data.jml_hadir || '0'}</td>
                      <td className="p-4 text-slate-600 text-right border-r border-slate-200">
                        Rp {Number(data.nominal_insentif || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 text-slate-600 text-right border-r border-slate-200">
                        Rp {Number(data.total_insentif || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 text-slate-600 text-right border-r border-slate-200">
                        Rp {Number(data.gaji_pokok || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 text-slate-600 border-r border-slate-200 max-w-[150px] truncate" title={data.nama_tugas !== '-' ? data.nama_tugas : ''}>
                        {data.nama_tugas !== '-' ? data.nama_tugas : '-'}
                      </td>
                      <td className="p-4 text-slate-600 text-right border-r border-slate-200">
                        Rp {Number(data.nominal_tugas_tambahan || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 text-rose-600 text-right border-r border-slate-200">
                        Rp {Number(data.potongan || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 font-bold text-emerald-600 text-right border-r border-slate-200">
                        Rp {Number(data.gaji_bersih || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 text-center border-r border-slate-200">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${data.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : data.status === 'Belum Approve' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                          {data.status}
                        </span>
                      </td>
                      <td className="p-4 text-center space-x-2">
                        <button 
                          onClick={() => !data.is_approved && handleOpenEdit(data.id)}
                          className={`p-1 rounded transition-colors ${data.is_approved ? 'text-slate-300 cursor-not-allowed' : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'}`} 
                          title={data.is_approved ? "Data sudah di-approve" : "Edit"}
                          disabled={data.is_approved}
                        >
                          <Edit2 size={18} />
                        </button>
                        {data.gaji_bulanan_id && data.is_approved && (
                          <button 
                            onClick={() => {
                              setSelectedRows([data.id]);
                              setShowUnapproveModal(true);
                            }}
                            className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 transition-colors" 
                            title="Unapprove"
                          >
                            <XCircle size={18} />
                          </button>
                        )}
                        {data.gaji_bulanan_id && (
                          <button 
                            onClick={() => !data.is_approved && confirmDelete(data.id)}
                            className={`p-1 rounded transition-colors ${data.is_approved ? 'text-slate-300 cursor-not-allowed' : 'text-rose-600 hover:text-rose-800 hover:bg-rose-50'}`} 
                            title={data.is_approved ? "Data sudah di-approve" : "Hapus"}
                            disabled={data.is_approved}
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">Hitung Gaji: {selectedBulan} {selectedTahun}</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto p-4 flex-1">
              <form id="gaji-form" onSubmit={handleSaveGaji} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Nama Pegawai</label>
                    <input 
                      type="text" 
                      value={formData.nama_pegawai} 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-500 text-sm" 
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Gaji Pokok (Rp)</label>
                    <input 
                      type="text" 
                      value={formData.gaji_pokok ? Number(formData.gaji_pokok).toLocaleString('id-ID') : '0'} 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-500 text-sm" 
                      readOnly
                    />
                  </div>
                </div>
                
                <div className="pt-3 pb-1 border-b border-slate-200">
                  <h4 className="font-bold text-sm text-slate-800">Insentif Kehadiran</h4>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Jml. Hadir</label>
                    <input 
                      type="number" 
                      value={formData.jml_hadir} 
                      onChange={handleHadirChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" 
                      placeholder="0" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Jml. Insentif (Rp)</label>
                    <input 
                      type="text" 
                      value={formData.nominal_insentif} 
                      onChange={handleInsentifChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" 
                      placeholder="3.000" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Total Insentif (Rp)</label>
                    <input 
                      type="text" 
                      value={formData.total_insentif} 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-emerald-50 font-medium text-slate-700 text-sm" 
                      placeholder="0" 
                      readOnly
                    />
                  </div>
                </div>

                <div className="pt-3 pb-1 border-b border-slate-200 flex justify-between items-center">
                  <h4 className="font-bold text-sm text-slate-800">Tugas Tambahan</h4>
                  <button 
                    type="button" 
                    onClick={addTugasDropdown}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded"
                  >
                    <Plus size={12} /> Tambah Tugas
                  </button>
                </div>
                
                <div className="space-y-2">
                  {formData.tugas_tambahan_ids.map((tugasId, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <select 
                        value={tugasId}
                        onChange={(e) => handleTugasChange(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      >
                        <option value="">-- Pilih Tugas Tambahan --</option>
                        {tugasTambahanList.map(t => (
                          <option key={t.id} value={t.id}>{t.nama_tugas} - Rp {Number(t.nominal).toLocaleString('id-ID')}</option>
                        ))}
                      </select>
                      {formData.tugas_tambahan_ids.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => removeTugasDropdown(index)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Total Tugas Tambahan (Rp)</label>
                    <input 
                      type="text" 
                      value={formData.nominal_tugas_tambahan} 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-emerald-50 font-medium text-slate-700 text-sm" 
                      placeholder="0" 
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Potongan (Rp)</label>
                    <input 
                      type="text" 
                      value={formData.potongan} 
                      onChange={handlePotonganChange}
                      className="w-full px-3 py-2 border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-rose-700 text-sm" 
                      placeholder="0" 
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 mt-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Gaji Bersih (Rp)</label>
                  <input 
                    type="text" 
                    value={formData.gaji_bersih} 
                    className="w-full px-3 py-2 border border-emerald-300 rounded-lg bg-emerald-100 font-bold text-emerald-800 text-lg" 
                    placeholder="0" 
                    readOnly
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Gaji Pokok + Insentif + Tugas Tambahan - Potongan</p>
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg mr-2 transition-colors text-sm">
                Batal
              </button>
              <button type="submit" form="gaji-form" className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors text-sm">
                Simpan Gaji
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
