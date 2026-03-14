import React, { useState, useEffect } from 'react';
import { Users, Wallet, Receipt, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedMonth]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch total pegawai and their order
      const { data: allPegawai, error: pegawaiError } = await supabase
        .from('pegawai')
        .select('id, nama')
        .order('created_at', { ascending: true });
        
      if (pegawaiError) throw pegawaiError;
      const totalPegawai = allPegawai?.length || 0;

      // Fetch gaji bulanan for selected month or all months
      let query = supabase
        .from('gaji_bulanan')
        .select('gaji_bersih, potongan, is_approved, total_insentif, nominal_tugas_tambahan, pegawai(nama)')
        .eq('tahun', currentYear);

      if (selectedMonth !== -1) {
        query = query.eq('bulan', MONTHS[selectedMonth]);
      }

      const { data: gajiData, error: gajiError } = await query;

      if (gajiError) throw gajiError;

      let totalGaji = 0;
      let totalPotongan = 0;
      let processed = 0;
      const employeeDataMap = new Map();

      if (gajiData && gajiData.length > 0) {
        gajiData.forEach(g => {
          totalGaji += Number(g.gaji_bersih || 0);
          totalPotongan += Number(g.potongan || 0);
          const isApproved = g.is_approved === true || g.is_approved === 'true' || g.is_approved === 'TRUE' || g.is_approved === 1;
          if (isApproved) {
            processed += 1;
          }

          const empName = Array.isArray(g.pegawai) ? g.pegawai[0]?.nama : (g.pegawai as any)?.nama || 'Unknown';
          const bersih = Number(g.gaji_bersih || 0);
          const pot = Number(g.potongan || 0);
          const insentif = Number(g.total_insentif || 0);
          const tugas = Number(g.nominal_tugas_tambahan || 0);
          const tunjangan = insentif + tugas;
          const pokok = bersih - tunjangan + pot;

          if (!employeeDataMap.has(empName)) {
            employeeDataMap.set(empName, {
              name: empName,
              'Gaji Pokok': 0,
              'Tunjangan': 0,
              'Potongan': 0,
              'Total Gaji': 0
            });
          }

          const emp = employeeDataMap.get(empName);
          emp['Gaji Pokok'] += pokok;
          emp['Tunjangan'] += tunjangan;
          emp['Potongan'] += pot;
          emp['Total Gaji'] += bersih;
        });
      }

      const chartDataArray = Array.from(employeeDataMap.values());
      
      // Sort chartData based on the order in allPegawai
      if (allPegawai) {
        chartDataArray.sort((a, b) => {
          const indexA = allPegawai.findIndex(p => p.nama === a.name);
          const indexB = allPegawai.findIndex(p => p.nama === b.name);
          // If not found, put at the end
          const posA = indexA !== -1 ? indexA : 999999;
          const posB = indexB !== -1 ? indexB : 999999;
          return posA - posB;
        });
      }

      setChartData(chartDataArray);

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

      // Fetch recent activities
      const { data: recentPegawai } = await supabase
        .from('pegawai')
        .select('nama, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      let gajiActQuery = supabase
        .from('gaji_bulanan')
        .select('bulan, tahun, created_at, pegawai(nama)')
        .order('created_at', { ascending: false })
        .limit(10);

      if (selectedMonth !== -1) {
        gajiActQuery = gajiActQuery.eq('bulan', MONTHS[selectedMonth]);
      }
      
      const { data: recentGaji } = await gajiActQuery;

      const activities: any[] = [];
      
      if (recentPegawai) {
        recentPegawai.forEach(p => {
          const pDate = new Date(p.created_at);
          if (selectedMonth === -1 || pDate.getMonth() === selectedMonth) {
            activities.push({
              user: 'Admin',
              action: `menambahkan pegawai baru: ${p.nama}`,
              date: pDate
            });
          }
        });
      }

      if (recentGaji) {
        recentGaji.forEach(g => {
          const pegawaiNama = Array.isArray(g.pegawai) ? g.pegawai[0]?.nama : (g.pegawai as any)?.nama;
          activities.push({
            user: 'Admin',
            action: `menghitung gaji ${pegawaiNama || 'pegawai'} untuk ${g.bulan} ${g.tahun}`,
            date: new Date(g.created_at)
          });
        });
      }

      activities.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      const now = new Date();
      const formattedActivities = activities.slice(0, 5).map(act => {
        const diffMs = now.getTime() - act.date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        let timeStr = 'Baru saja';
        if (diffDays > 0) {
          timeStr = `${diffDays} hari yang lalu`;
        } else if (diffHours > 0) {
          timeStr = `${diffHours} jam yang lalu`;
        } else if (diffMins > 0) {
          timeStr = `${diffMins} menit yang lalu`;
        }
        
        return {
          user: act.user,
          action: act.action,
          time: timeStr
        };
      });

      setRecentActivities(formattedActivities);

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      if (error.message?.includes('is_approved') || error.code === '42703') {
        setDbError('Kolom is_approved belum terdeteksi. Silakan jalankan script SQL perbaikan di Supabase SQL Editor, lalu jalankan perintah: NOTIFY pgrst, \'reload schema\';');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const stats = [
    { label: 'Total Pegawai', value: dashboardData.totalPegawai.toString(), icon: <Users size={24} className="text-white" />, bg: 'bg-blue-600 text-white', iconBg: 'bg-blue-500/30' },
    { label: `Total Gaji ${selectedMonth === -1 ? 'Tahun Ini' : MONTHS[selectedMonth]}`, value: formatCurrency(dashboardData.totalGaji), icon: <Wallet size={24} className="text-white" />, bg: 'bg-emerald-600 text-white', iconBg: 'bg-emerald-500/30' },
    { label: 'Total Potongan', value: formatCurrency(dashboardData.totalPotongan), icon: <Receipt size={24} className="text-white" />, bg: 'bg-rose-600 text-white', iconBg: 'bg-rose-500/30' },
    { label: 'Rata-rata Gaji', value: formatCurrency(dashboardData.rataRataGaji), icon: <TrendingUp size={24} className="text-white" />, bg: 'bg-indigo-600 text-white', iconBg: 'bg-indigo-500/30' },
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
          <div key={index} className={`${stat.bg} p-6 rounded-xl border border-transparent shadow-sm flex items-center gap-4 transition-all hover:shadow-md`}>
            <div className={`p-4 rounded-lg ${stat.iconBg}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-sm font-medium opacity-80">{stat.label}</p>
              <p className="text-xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Grafik Gaji Pegawai ({selectedMonth === -1 ? 'Tahun Ini' : MONTHS[selectedMonth]})</h3>
        <div className="h-[400px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(value) => `Rp ${value.toLocaleString('id-ID')}`}
                  dx={-10}
                />
                <Tooltip 
                  formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, undefined]}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" dataKey="Gaji Pokok" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Tunjangan" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Potongan" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500">
              Belum ada data gaji untuk ditampilkan.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Aktivitas Terakhir ({selectedMonth === -1 ? 'Semua Bulan' : MONTHS[selectedMonth]})</h3>
          <div className="space-y-4">
            {recentActivities.length > 0 ? (
              recentActivities.map((act, i) => (
                <div key={i} className="flex items-center gap-4 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-medium shrink-0">
                    {act.user.charAt(0)}{act.user.split(' ')[1] ? act.user.split(' ')[1].charAt(0) : ''}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      <span className="font-semibold">{act.user}</span> {act.action}
                    </p>
                    <p className="text-xs text-slate-500">{act.time}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">Belum ada aktivitas tercatat.</p>
            )}
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
