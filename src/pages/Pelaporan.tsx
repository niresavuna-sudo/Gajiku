import React from 'react';
import { BarChart3, Download } from 'lucide-react';

export function Pelaporan() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Pelaporan</h2>
        <p className="text-slate-500">Laporan rekapitulasi penggajian bulanan dan tahunan.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:border-emerald-500 transition-colors cursor-pointer group">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
            <BarChart3 size={32} />
          </div>
          <h3 className="font-bold text-slate-800 mb-2">Rekap Gaji Bulanan</h3>
          <p className="text-sm text-slate-500 mb-4">Laporan total pengeluaran gaji untuk satu bulan tertentu.</p>
          <button className="mt-auto flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700">
            <Download size={16} /> Unduh Laporan
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:border-blue-500 transition-colors cursor-pointer group">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
            <BarChart3 size={32} />
          </div>
          <h3 className="font-bold text-slate-800 mb-2">Rekap Gaji Tahunan</h3>
          <p className="text-sm text-slate-500 mb-4">Laporan akumulasi pengeluaran gaji selama satu tahun.</p>
          <button className="mt-auto flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">
            <Download size={16} /> Unduh Laporan
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:border-rose-500 transition-colors cursor-pointer group">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-4 group-hover:bg-rose-100 transition-colors">
            <BarChart3 size={32} />
          </div>
          <h3 className="font-bold text-slate-800 mb-2">Rekap Potongan</h3>
          <p className="text-sm text-slate-500 mb-4">Laporan rincian potongan pegawai (BPJS, Koperasi, dll).</p>
          <button className="mt-auto flex items-center gap-2 text-sm font-medium text-rose-600 hover:text-rose-700">
            <Download size={16} /> Unduh Laporan
          </button>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Riwayat Pelaporan Terakhir</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="p-3 font-medium">Nama Laporan</th>
                <th className="p-3 font-medium">Periode</th>
                <th className="p-3 font-medium">Dibuat Oleh</th>
                <th className="p-3 font-medium">Tanggal</th>
                <th className="p-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-200">
              {[
                { nama: 'Rekap Gaji Bulanan', periode: 'Januari 2026', admin: 'Admin Utama', tgl: '01 Feb 2026' },
                { nama: 'Rekap Potongan BPJS', periode: 'Januari 2026', admin: 'Admin Keuangan', tgl: '01 Feb 2026' },
                { nama: 'Rekap Gaji Tahunan', periode: 'Tahun 2025', admin: 'Admin Utama', tgl: '05 Jan 2026' },
              ].map((l, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-800">{l.nama}</td>
                  <td className="p-3 text-slate-600">{l.periode}</td>
                  <td className="p-3 text-slate-600">{l.admin}</td>
                  <td className="p-3 text-slate-600">{l.tgl}</td>
                  <td className="p-3 text-right">
                    <button className="text-blue-600 hover:text-blue-800 font-medium text-xs bg-blue-50 px-3 py-1 rounded">Unduh Ulang</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
