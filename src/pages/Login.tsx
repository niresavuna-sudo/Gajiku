import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, User, Loader2, School, ArrowRight } from 'lucide-react';

interface LoginProps {
  onLogin: (admin: any) => void;
}

const BACKGROUND_IMAGES = [
  'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?q=80&w=1920&auto=format&fit=crop', // Mosque interior
  'https://images.unsplash.com/photo-1609599006351-8264cb3b4d59?q=80&w=1920&auto=format&fit=crop', // Quran
  'https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=1920&auto=format&fit=crop', // Kids studying
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=1920&auto=format&fit=crop', // Books/Library
  'https://images.unsplash.com/photo-1585036156171-384164a8c675?q=80&w=1920&auto=format&fit=crop'  // Islamic architecture
];

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [schoolName, setSchoolName] = useState('Sistem Penggajian');
  const [logoUrl, setLogoUrl] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchAppConfig = async () => {
      try {
        // Fetch school name
        const { data: profilData } = await supabase
          .from('profil_sekolah')
          .select('nama_sekolah')
          .limit(1)
          .single();
        
        if (profilData?.nama_sekolah) {
          setSchoolName(profilData.nama_sekolah);
        }

        // Fetch logo
        const { data: pengaturanData } = await supabase
          .from('pengaturan')
          .select('logo_url')
          .limit(1)
          .single();
          
        if (pengaturanData?.logo_url) {
          setLogoUrl(pengaturanData.logo_url);
        }
      } catch (err) {
        console.error('Error fetching app config:', err);
      }
    };

    const checkDefaultAdmin = async () => {
      try {
        const { count } = await supabase.from('admin').select('*', { count: 'exact', head: true });
        if (count === 0) {
          await supabase.from('admin').insert([{
            nama: 'Administrator',
            email: 'admin@sekolah.sch.id',
            username: 'admin',
            password: 'password',
            role: 'Super Admin',
            status: 'Aktif'
          }]);
        }
      } catch (err) {
        console.error('Error checking default admin:', err);
      }
    };
    
    fetchAppConfig();
    checkDefaultAdmin();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data, error: fetchError } = await supabase
        .from('admin')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .eq('status', 'Aktif')
        .single();

      if (fetchError || !data) {
        throw new Error('Username atau sandi salah, atau akun tidak aktif.');
      }

      onLogin(data);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat login. Pastikan username dan sandi benar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background Slider */}
      <div className="absolute inset-0 z-0">
        {BACKGROUND_IMAGES.map((img, index) => (
          <div
            key={img}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={img}
              alt={`Background ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-slate-900/75"></div>
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-24 h-24 object-contain bg-white/10 p-2 rounded-2xl backdrop-blur-sm" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <School className="text-white" size={32} />
            </div>
          )}
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white drop-shadow-md">
          {schoolName}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-200 drop-shadow">
          Masuk ke akun administrator Anda
        </p>
      </div>

      <div className="relative z-10 mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-md">
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700">
                Username
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="focus:ring-emerald-500 focus:border-emerald-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-2.5 border"
                  placeholder="Masukkan username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Sandi
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="focus:ring-emerald-500 focus:border-emerald-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-2.5 border"
                  placeholder="Masukkan sandi"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-70 transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Memproses...
                  </>
                ) : (
                  <>
                    Masuk <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-300 drop-shadow">
            @Design by Mard | Gajiku 2026
          </p>
        </div>
      </div>
    </div>
  );
}
