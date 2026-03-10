import React, { useState, useEffect } from 'react';
import { Users, Wallet, Receipt, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR', 
    maximumFractionDigits: 0 
  }).format(amount);
};

export function Dashboard() {
  const currentMonthIndex = new Date().getMonth();
  const currentYear = new Date().getFullYear().toString();
  const [selectedMonth, setSelectedMonth] = useState(-1);
  
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState({
    totalPegawai: 0,
    totalGaji: 0,
    totalPotongan: 0,
    rataRataGaji: 0,
    status: {
      percentage: 0,
      processed: 0,
      total: 0
    }
  });

  useEffect(() => {
    fetchDashboardData();
  }, [selectedMonth]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch total pegawai
      const { count: totalPegawai, error: pegawaiError } = await supabase
        .from('pegawai')
        .select('*', { count: 'exact', head: true });
        
      if (pegawaiError) throw pegawaiError;

      // Fetch gaji bulanan for selected month or all months
      let query = supabase
        .from('gaji_bulanan')
        .select('gaji_bersih, potongan, is_approved')
        .eq('tahun', currentYear);

      if (selectedMonth !== -1) {
        query = query.eq('bulan', MONTHS[selectedMonth]);
      }

      const { data: gajiData, error: gajiError } = await query;

      if (gajiError) throw gajiError;

      let totalGaji = 0;
      let totalPotongan = 0;
      let processed = 0;

      if (gajiData && gajiData.length > 0) {
        gajiData.forEach(g => {
          totalGaji += Number(g.gaji_bersih || 0);
          totalPotongan += Number(g.potongan || 0);
          const isApproved = g.is_approved === true || g.is_approved === 'true' || g.is_approved === 'TRUE' || g.is_approved === 1;
          if (isApproved) {
            processed += 1;
          }
        });
      }

      const rataRataGaji = totalPegawai && totalPegawai > 0 ? Math.round(totalGaji / totalPegawai) : 0;
      const expectedTotal = totalPegawai ? (selectedMonth === -1 ? totalPegawai * 12 : totalPegawai) : 0;
      const percentage = expectedTotal > 0 ? Math.round((processed / expectedTotal) * 100) : 0;

      setDashboardData({
        totalPegawai: totalPegawai || 0,
        totalGaji,
        totalPotongan,
        rataRataGaji,
        status: {
          percentage,
          processed,
          total: expectedTotal
        }
      });

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      if (error.message?.includes('is_approved') || error.code === '42703') {
        setDbError('Kolom is_approved belum terdeteksi. Silakan jalankan script SQL perbaikan di Supabase SQL Editor, lalu jalankan perintah: NOTIFY pgrst, \'reload schema\';');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const aktivitasList = [
    [
      { user: 'Admin 1', action: 'mencetak laporan bulanan', time: '2 jam yang lalu' },
      { user: 'Admin 2', action: 'melihat rekap gaji', time: '5 jam yang lalu' },
      { user: 'Admin 1', action: 'login ke sistem', time: '1 hari yang lalu' },
    ],
    [
      { user: 'Admin 3', action: 'menambahkan pegawai baru', time: '10 menit yang lalu' },
      { user: 'Admin 1', action: 'mencetak slip gaji', time: '3 jam yang lalu' },
      { user: 'Admin 2', action: 'memperbarui data potongan', time: '1 hari yang lalu' },
    ],
    [
      { user: 'Admin 1', action: 'menghitung gaji pegawai', time: 'Baru saja' },
      { user: 'Admin 2', action: 'memperbarui data absensi', time: '2 jam yang lalu' },
      { user: 'Admin 3', action: 'menambahkan komponen tunjangan', time: '4 jam yang lalu' },
    ]
  ];

  const aktivitas = aktivitasList[selectedMonth === -1 ? 0 : selectedMonth % 3];

  const stats = [
    { label: 'Total Pegawai', value: dashboardData.totalPegawai.toString(), icon: <Users size={24} className="text-blue-500" />, bg: 'bg-blue-50' },
    { label: `Total Gaji ${selectedMonth === -1 ? 'Tahun Ini' : MONTHS[selectedMonth]}`, value: formatCurrency(dashboardData.totalGaji), icon: <Wallet size={24} className="text-emerald-500" />, bg: 'bg-emerald-50' },
    { label: 'Total Potongan', value: formatCurrency(dashboardData.totalPotongan), icon: <Receipt size={24} className="text-rose-500" />, bg: 'bg-rose-50' },
    { label: 'Rata-rata Gaji', value: formatCurrency(dashboardData.rataRataGaji), icon: <TrendingUp size={24} className="text-indigo-500" />, bg: 'bg-indigo-50' },
  ];

  return (
    <div className="space-y-6">
      {dbError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
          <div className="text-rose-600 mt-0.5">⚠️</div>
          <div>
            <h4 className="font-medium text-rose-800">Error Database</h4>
            <p className="text-sm text-rose-600 mt-1">{dbError}</p>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
          <p className="text-slate-500">Ringkasan informasi penggajian {selectedMonth === -1 ? `Tahun ${currentYear}` : `bulan ${MONTHS[selectedMonth]}`}.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
          <Calendar size={18} className="text-slate-500" />
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-transparent border-none text-sm font-medium text-slate-700 focus:outline-none focus:ring-0 cursor-pointer"
          >
            <option value={-1}>Semua Bulan</option>
            {MONTHS.map((month, index) => (
              <option key={month} value={index}>{month}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
            <div className={`p-4 rounded-lg ${stat.bg}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-xl font-bold text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Aktivitas Terakhir ({selectedMonth === -1 ? 'Semua Bulan' : MONTHS[selectedMonth]})</h3>
          <div className="space-y-4">
            {aktivitas.map((act, i) => (
              <div key={i} className="flex items-center gap-4 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-medium shrink-0">
                  {act.user.charAt(0)}{act.user.split(' ')[1]}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    <span className="font-semibold">{act.user}</span> {act.action}
                  </p>
                  <p className="text-xs text-slate-500">{act.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Status Penggajian ({selectedMonth === -1 ? 'Tahun Ini' : MONTHS[selectedMonth]})</h3>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="relative w-32 h-32 mb-4">
              {/* Circular Progress Background */}
              <svg className="w-full h-full" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                {/* Circular Progress Value */}
                <path
                  className={`${dashboardData.status.percentage === 100 ? 'text-emerald-500' : dashboardData.status.percentage > 0 ? 'text-blue-500' : 'text-slate-300'} transition-all duration-1000 ease-out`}
                  strokeDasharray={`${dashboardData.status.percentage}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-3xl font-bold ${dashboardData.status.percentage === 100 ? 'text-emerald-500' : dashboardData.status.percentage > 0 ? 'text-blue-500' : 'text-slate-400'}`}>
                  {dashboardData.status.percentage}%
                </span>
              </div>
            </div>
            
            <p className="text-slate-800 font-medium text-lg">
              {dashboardData.status.percentage === 100 
                ? 'Penggajian Selesai' 
                : dashboardData.status.percentage === 0 
                  ? 'Belum Dimulai' 
                  : 'Proses Penggajian Berjalan'}
            </p>
            <p className="text-sm text-slate-500 mt-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
              <span className="font-semibold text-slate-700">{dashboardData.status.processed}</span> dari <span className="font-semibold text-slate-700">{dashboardData.status.total}</span> pegawai telah diproses
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
