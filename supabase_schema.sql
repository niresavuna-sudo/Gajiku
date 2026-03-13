-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table: profil_sekolah
CREATE TABLE IF NOT EXISTS profil_sekolah (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_sekolah TEXT,
    npsn TEXT,
    alamat TEXT,
    desa TEXT,
    kecamatan TEXT,
    kabupaten TEXT,
    provinsi TEXT,
    kepala_yayasan_nama TEXT,
    kepala_yayasan_nip TEXT,
    kepala_madrasah_nama TEXT,
    kepala_madrasah_nip TEXT,
    kepala_sekolah TEXT,
    nip_kepsek TEXT,
    bendahara_nama TEXT,
    bendahara_nip TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table: pegawai
CREATE TABLE IF NOT EXISTS pegawai (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama TEXT NOT NULL,
    nip TEXT,
    tempat_tgl_lahir TEXT,
    alamat TEXT,
    kontak TEXT,
    status TEXT,
    jabatan TEXT,
    tahun_masuk INTEGER,
    username TEXT UNIQUE,
    password TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table: tugas_tambahan
CREATE TABLE IF NOT EXISTS tugas_tambahan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_tugas TEXT NOT NULL,
    nominal NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table: gaji_pegawai (Data Gaji Pokok & Tunjangan Tetap)
CREATE TABLE IF NOT EXISTS gaji_pegawai (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pegawai_id UUID REFERENCES pegawai(id) ON DELETE CASCADE,
    jam_mengajar INTEGER DEFAULT 0,
    nominal_masa_kerja NUMERIC DEFAULT 5000,
    tunjangan_masa_kerja NUMERIC DEFAULT 0,
    nominal_jam_mengajar NUMERIC DEFAULT 16000,
    tunjangan_jam_mengajar NUMERIC DEFAULT 0,
    total_gaji_pokok NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pegawai_id)
);

-- 5. Table: gaji_bulanan (Data Hitung Gaji & Potongan per Bulan)
CREATE TABLE IF NOT EXISTS gaji_bulanan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pegawai_id UUID REFERENCES pegawai(id) ON DELETE CASCADE,
    bulan TEXT NOT NULL,
    tahun TEXT NOT NULL,
    jml_hadir INTEGER DEFAULT 0,
    nominal_insentif NUMERIC DEFAULT 3000,
    total_insentif NUMERIC DEFAULT 0,
    tugas_tambahan_id UUID REFERENCES tugas_tambahan(id) ON DELETE SET NULL,
    tugas_tambahan_ids JSONB DEFAULT '[]'::jsonb,
    nominal_tugas_tambahan NUMERIC DEFAULT 0,
    potongan NUMERIC DEFAULT 0,
    gaji_bersih NUMERIC DEFAULT 0,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pegawai_id, bulan, tahun)
);

-- 6. Table: pengaturan (Opsional untuk halaman Pengaturan)
CREATE TABLE IF NOT EXISTS pengaturan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tahun_anggaran TEXT DEFAULT '2026',
    logo_url TEXT,
    backup_otomatis BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Table: admin (Opsional untuk Manajemen Admin)
CREATE TABLE IF NOT EXISTS admin (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'Admin Keuangan',
    status TEXT DEFAULT 'Aktif',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ENABLE REALTIME UNTUK SEMUA TABEL
-- ==========================================
-- Drop publication if it exists to recreate it with all tables
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;

ALTER PUBLICATION supabase_realtime ADD TABLE profil_sekolah;
ALTER PUBLICATION supabase_realtime ADD TABLE pegawai;
ALTER PUBLICATION supabase_realtime ADD TABLE tugas_tambahan;
ALTER PUBLICATION supabase_realtime ADD TABLE gaji_pegawai;
ALTER PUBLICATION supabase_realtime ADD TABLE gaji_bulanan;
ALTER PUBLICATION supabase_realtime ADD TABLE pengaturan;
ALTER PUBLICATION supabase_realtime ADD TABLE admin;

-- ==========================================
-- INSERT DATA AWAL (DUMMY/DEFAULT)
-- ==========================================
INSERT INTO profil_sekolah (nama_sekolah, npsn, alamat, kepala_sekolah, nip_kepsek)
VALUES ('SDIT Contoh', '12345678', 'Jl. Pendidikan No. 1', 'Ahmad Dahlan, S.Pd', '198001012005011001')
ON CONFLICT DO NOTHING;

INSERT INTO pengaturan (tahun_anggaran, logo_url, backup_otomatis)
VALUES ('2026', '', true)
ON CONFLICT DO NOTHING;
