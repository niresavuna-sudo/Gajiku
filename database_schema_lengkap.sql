-- Drop existing tables if they exist to start fresh
DROP TABLE IF EXISTS public.gaji_bulanan CASCADE;
DROP TABLE IF EXISTS public.gaji_pegawai CASCADE;
DROP TABLE IF EXISTS public.pegawai_tugas CASCADE;
DROP TABLE IF EXISTS public.tugas_tambahan CASCADE;
DROP TABLE IF EXISTS public.pegawai CASCADE;
DROP TABLE IF EXISTS public.profil_sekolah CASCADE;

-- 1. Create profil_sekolah table
CREATE TABLE public.profil_sekolah (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama_sekolah VARCHAR(255),
    npsn VARCHAR(50),
    alamat TEXT,
    desa VARCHAR(255),
    kecamatan VARCHAR(255),
    kabupaten VARCHAR(255),
    provinsi VARCHAR(255),
    kepala_yayasan_nama VARCHAR(255),
    kepala_yayasan_nip VARCHAR(50),
    kepala_madrasah_nama VARCHAR(255),
    kepala_madrasah_nip VARCHAR(50),
    kepala_sekolah VARCHAR(255),
    nip_kepala_sekolah VARCHAR(50),
    bendahara_nama VARCHAR(255),
    bendahara_nip VARCHAR(50),
    bendahara VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create pegawai table
CREATE TABLE public.pegawai (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    nip VARCHAR(50),
    tempat_tgl_lahir VARCHAR(255),
    tahun_masuk INTEGER,
    alamat TEXT,
    kontak VARCHAR(50),
    status VARCHAR(50),
    jabatan VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create tugas_tambahan table
CREATE TABLE public.tugas_tambahan (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama_tugas VARCHAR(255) NOT NULL,
    nominal NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create gaji_pegawai table (Gaji Pokok)
CREATE TABLE public.gaji_pegawai (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pegawai_id UUID REFERENCES public.pegawai(id) ON DELETE CASCADE,
    jam_mengajar INTEGER DEFAULT 0,
    nominal_masa_kerja NUMERIC DEFAULT 5000,
    tunjangan_masa_kerja NUMERIC DEFAULT 0,
    nominal_jam_mengajar NUMERIC DEFAULT 16000,
    tunjangan_jam_mengajar NUMERIC DEFAULT 0,
    total_gaji_pokok NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(pegawai_id)
);

-- 5. Create gaji_bulanan table (Hitung Gaji)
CREATE TABLE public.gaji_bulanan (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pegawai_id UUID REFERENCES public.pegawai(id) ON DELETE CASCADE,
    bulan VARCHAR(20) NOT NULL,
    tahun VARCHAR(4) NOT NULL,
    jml_hadir NUMERIC DEFAULT 0,
    nominal_insentif NUMERIC DEFAULT 3000,
    total_insentif NUMERIC DEFAULT 0,
    tugas_tambahan_id UUID REFERENCES public.tugas_tambahan(id) ON DELETE SET NULL,
    tugas_tambahan_ids JSONB DEFAULT '[]'::jsonb,
    nominal_tugas_tambahan NUMERIC DEFAULT 0,
    potongan NUMERIC DEFAULT 0,
    gaji_bersih NUMERIC DEFAULT 0,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(pegawai_id, bulan, tahun)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profil_sekolah ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pegawai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tugas_tambahan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gaji_pegawai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gaji_bulanan ENABLE ROW LEVEL SECURITY;

-- Create Policies (Allow all access for simplicity in this app)
CREATE POLICY "Enable all access" ON public.profil_sekolah FOR ALL USING (true);
CREATE POLICY "Enable all access" ON public.pegawai FOR ALL USING (true);
CREATE POLICY "Enable all access" ON public.tugas_tambahan FOR ALL USING (true);
CREATE POLICY "Enable all access" ON public.gaji_pegawai FOR ALL USING (true);
CREATE POLICY "Enable all access" ON public.gaji_bulanan FOR ALL USING (true);

-- Enable Realtime for all tables
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profil_sekolah;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pegawai;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tugas_tambahan;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gaji_pegawai;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gaji_bulanan;
