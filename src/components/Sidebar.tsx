import React from 'react';
import { 
  LayoutDashboard, 
  Database, 
  Wallet, 
  Calculator, 
  Receipt, 
  Printer, 
  FileText, 
  Settings 
} from 'lucide-react';
import { MenuId } from '../types';

interface SidebarProps {
  activeMenu: MenuId;
  setActiveMenu: (menu: MenuId) => void;
  isOpen?: boolean;
}

export function Sidebar({ activeMenu, setActiveMenu, isOpen = true }: SidebarProps) {
  const menuItems: { id: MenuId; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'data-awal', label: 'Data Awal', icon: <Database size={20} /> },
    { id: 'gaji-pokok', label: 'Gaji Pokok', icon: <Wallet size={20} /> },
    { id: 'potongan-gaji', label: 'Potongan Gaji', icon: <Receipt size={20} /> },
    { id: 'hitung-gaji', label: 'Hitung Gaji', icon: <Calculator size={20} /> },
    { id: 'cetak', label: 'Cetak', icon: <Printer size={20} /> },
    { id: 'pelaporan', label: 'Pelaporan', icon: <FileText size={20} /> },
    { id: 'pengaturan', label: 'Pengaturan', icon: <Settings size={20} /> },
  ];

  return (
    <div className={`bg-slate-900 text-white h-screen flex flex-col transition-all duration-300 ease-in-out ${isOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
      <div className="p-6 border-b border-slate-800 whitespace-nowrap">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Wallet className="text-emerald-400" />
          <span>Gajiku</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">Sistem Penggajian</p>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setActiveMenu(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors whitespace-nowrap ${
                  activeMenu === item.id
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.icon}
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center whitespace-nowrap">
        @Desigh by Mard | Gajiku 2026
      </div>
    </div>
  );
}
