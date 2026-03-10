-- Script untuk memperbaiki tabel gaji_bulanan agar fitur Approve berjalan dengan baik

-- 1. Pastikan kolom is_approved ada di tabel gaji_bulanan
ALTER TABLE public.gaji_bulanan ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

-- 2. Pastikan kolom tugas_tambahan_ids ada dan bertipe JSONB
ALTER TABLE public.gaji_bulanan ADD COLUMN IF NOT EXISTS tugas_tambahan_ids JSONB DEFAULT '[]'::jsonb;

-- 3. Perbarui RLS (Row Level Security) agar mengizinkan UPDATE dan INSERT
-- Hapus policy lama jika ada (opsional, untuk mencegah duplikat)
DROP POLICY IF EXISTS "Enable all access" ON public.gaji_bulanan;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.gaji_bulanan;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.gaji_bulanan;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.gaji_bulanan;

-- Buat policy baru yang mengizinkan semua operasi (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Enable all access" ON public.gaji_bulanan FOR ALL USING (true) WITH CHECK (true);

-- Pastikan RLS aktif
ALTER TABLE public.gaji_bulanan ENABLE ROW LEVEL SECURITY;

-- 4. Set semua data yang sudah ada menjadi belum di-approve (opsional)
-- UPDATE public.gaji_bulanan SET is_approved = false WHERE is_approved IS NULL;
