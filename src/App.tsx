import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { DataAwal } from './pages/DataAwal';
import { GajiPokok } from './pages/GajiPokok';
import { HitungGaji } from './pages/HitungGaji';
import { PotonganGaji } from './pages/PotonganGaji';
import { Cetak } from './pages/Cetak';
import { Pelaporan } from './pages/Pelaporan';
import { Pengaturan } from './pages/Pengaturan';
import { MenuId } from './types';
import { Bell, UserCircle, Menu } from 'lucide-react';

export default function App() {
  const [activeMenu, setActiveMenu] = useState<MenuId>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [tahunAnggaran, setTahunAnggaran] = useState('2026');

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard': return <Dashboard />;
      case 'data-awal': return <DataAwal />;
      case 'gaji-pokok': return <GajiPokok />;
      case 'hitung-gaji': return <HitungGaji />;
      case 'potongan-gaji': return <PotonganGaji />;
      case 'cetak': return <Cetak />;
      case 'pelaporan': return <Pelaporan />;
      case 'pengaturan': return <Pengaturan tahunAnggaran={tahunAnggaran} setTahunAnggaran={setTahunAnggaran} />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden print:h-auto print:overflow-visible">
      <div className="print:hidden">
        <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} isOpen={isSidebarOpen} />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden print:overflow-visible">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shrink-0 print:hidden">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="text-sm text-slate-500 font-medium hidden sm:block">
              Tahun Anggaran: <span className="text-slate-800">{tahunAnggaran}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-slate-600 relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
            </button>
            <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-slate-800">Admin Keuangan</p>
                <p className="text-xs text-slate-500">admin@sekolah.sch.id</p>
              </div>
              <UserCircle size={32} className="text-slate-400" />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8 print:overflow-visible print:p-0">
          <div className="max-w-6xl mx-auto print:max-w-none print:mx-0">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
