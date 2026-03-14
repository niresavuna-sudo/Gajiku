import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { DataAwal } from './pages/DataAwal';
import { GajiPokok } from './pages/GajiPokok';
import { HitungGaji } from './pages/HitungGaji';
import { PotonganGaji } from './pages/PotonganGaji';
import { Cetak } from './pages/Cetak';
import { Pelaporan } from './pages/Pelaporan';
import { Pengaturan } from './pages/Pengaturan';
import { Login } from './pages/Login';
import { MenuId } from './types';
import { Bell, UserCircle, Menu, LogOut } from 'lucide-react';
import { supabase } from './lib/supabase';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loggedInAdmin, setLoggedInAdmin] = useState<any>(null);

  const [activeMenu, setActiveMenu] = useState<MenuId>(() => {
    const saved = localStorage.getItem('activeMenu');
    return (saved as MenuId) || 'dashboard';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [tahunAnggaran, setTahunAnggaran] = useState(() => {
    const saved = localStorage.getItem('tahunAnggaran');
    return saved || '2026';
  });
  const [subPath, setSubPath] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Check for saved session
    const savedSession = localStorage.getItem('adminSession');
    if (savedSession) {
      try {
        const admin = JSON.parse(savedSession);
        setLoggedInAdmin(admin);
        setIsAuthenticated(true);
      } catch (e) {
        localStorage.removeItem('adminSession');
      }
    }
  }, []);

  useEffect(() => {
    if (!loggedInAdmin?.id) return;

    // Listen for changes to the currently logged in admin
    const adminSubscription = supabase
      .channel('current_admin_changes')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'admin',
        filter: `id=eq.${loggedInAdmin.id}`
      }, (payload) => {
        const updatedAdmin = payload.new;
        if (updatedAdmin.status !== 'Aktif') {
          handleLogout(); // Force logout if deactivated
        } else {
          setLoggedInAdmin(updatedAdmin);
          localStorage.setItem('adminSession', JSON.stringify(updatedAdmin));
        }
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'admin',
        filter: `id=eq.${loggedInAdmin.id}`
      }, () => {
        handleLogout(); // Force logout if deleted
      })
      .subscribe();

    return () => {
      supabase.removeChannel(adminSubscription);
    };
  }, [loggedInAdmin?.id]);

  useEffect(() => {
    localStorage.setItem('activeMenu', activeMenu);
    setSubPath(''); // Reset subPath when menu changes
  }, [activeMenu]);

  useEffect(() => {
    localStorage.setItem('tahunAnggaran', tahunAnggaran);
  }, [tahunAnggaran]);

  const handleLogin = (admin: any) => {
    setLoggedInAdmin(admin);
    setIsAuthenticated(true);
    localStorage.setItem('adminSession', JSON.stringify(admin));
    setActiveMenu('dashboard');
  };

  const handleLogout = () => {
    setLoggedInAdmin(null);
    setIsAuthenticated(false);
    localStorage.removeItem('adminSession');
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  const getMenuName = (id: MenuId) => {
    switch (id) {
      case 'dashboard': return 'Dashboard';
      case 'data-awal': return 'Data Awal';
      case 'gaji-pokok': return 'Gaji Pokok';
      case 'potongan-gaji': return 'Potongan Gaji';
      case 'hitung-gaji': return 'Hitung Gaji';
      case 'cetak': return 'Cetak';
      case 'pelaporan': return 'Pelaporan';
      case 'pengaturan': return 'Pengaturan';
      default: return '';
    }
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard': return <Dashboard />;
      case 'data-awal': return <DataAwal setSubPath={setSubPath} />;
      case 'gaji-pokok': return <GajiPokok />;
      case 'hitung-gaji': return <HitungGaji />;
      case 'potongan-gaji': return <PotonganGaji />;
      case 'cetak': return <Cetak />;
      case 'pelaporan': return <Pelaporan />;
      case 'pengaturan': return <Pengaturan tahunAnggaran={tahunAnggaran} setTahunAnggaran={setTahunAnggaran} setSubPath={setSubPath} />;
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
            <div className="hidden sm:flex flex-col">
              <div className="text-xs text-slate-400 mb-0.5 font-medium">
                Home / {getMenuName(activeMenu)}{subPath ? ` / ${subPath}` : ''}
              </div>
              <div className="text-sm text-slate-500 font-medium">
                Tahun Anggaran: <span className="text-slate-800">{tahunAnggaran}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-slate-600 relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
            </button>
            <div className="relative" ref={profileMenuRef}>
              <button 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2 pl-4 border-l border-slate-200 focus:outline-none hover:opacity-80 transition-opacity"
              >
                <div className="text-right hidden md:block">
                  <p className="text-sm font-medium text-slate-800">{loggedInAdmin?.nama || 'Admin Keuangan'}</p>
                  <p className="text-xs text-slate-500">{loggedInAdmin?.role || 'Administrator'}</p>
                </div>
                <UserCircle size={32} className="text-slate-400" />
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-50">
                  <button 
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors" 
                  >
                    <LogOut size={16} />
                    Keluar
                  </button>
                </div>
              )}
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
