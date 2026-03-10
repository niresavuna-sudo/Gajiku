export type MenuId =
  | 'dashboard'
  | 'data-awal'
  | 'gaji-pokok'
  | 'hitung-gaji'
  | 'potongan-gaji'
  | 'cetak'
  | 'pelaporan'
  | 'pengaturan';

export interface Pegawai {
  id: string;
  nip: string;
  nama: string;
  jabatan: string;
  status: 'Guru' | 'Pegawai';
  golongan: string;
}

export interface Sekolah {
  nama: string;
  npsn: string;
  alamat: string;
  kepalaSekolah: string;
  nipKepalaSekolah: string;
}
