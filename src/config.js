// Konfigurasi & data referensi Dashboard TKIN.
// Ubah daftar divisi, tahapan, jenis kajian, atau pertanyaan survei di sini.

// Diatur lewat mode build (lihat package.json):
//   npm run dev / npm run build                 -> data contoh fiktif (demo, portfolio, GitHub Pages); isian tidak disimpan
//   npm run dev:ujicoba / npm run build:ujicoba -> data kosong (uji coba input); isian tersimpan di browser masing-masing
export const DATA_CONTOH = import.meta.env.VITE_DATA !== 'kosong';

/* ================= Referensi ================= */
export const TAHAP=['Penugasan','Pengumpulan Data','Pembahasan','Penyusunan Draft','Review','Finalisasi','Disampaikan ke Direksi','Keputusan & Tindak Lanjut'];
export const JENIS=['Kebijakan Internal','Harga Produk Hasil Riset','Kelayakan Usaha & Lahan','SOP & Instruksi Kerja','Lainnya'];
export const KEP=['Belum diputuskan','Diterima','Diterima dengan catatan','Dikaji ulang','Ditolak'];
export const KEP_C={'Belum diputuskan':'var(--line-2)','Diterima':'var(--ok)','Diterima dengan catatan':'var(--info)','Dikaji ulang':'var(--warn)','Ditolak':'var(--bad)'};
export const LAYAK_SURVEI=['Diterima','Diterima dengan catatan'];
export const ST_DATA=['Diminta','Diterima sebagian','Lengkap'];
export const ST_DATA_C={'Diminta':'var(--info)','Diterima sebagian':'var(--warn)','Lengkap':'var(--ok)'};
export const SOP_TAHAP=['Draft','Pembahasan','Revisi','Finalisasi','Disahkan'];
export const JENIS_DOK=['Working Paper','Notulensi','Data Pendukung','Hasil Kajian','Bahan Paparan','Surat'];
export const DIR_DOK=['Hasil Kajian','Bahan Paparan'];
export const DIVISI=[
  ['PPKS','Pusat Penelitian Kelapa Sawit'],['Puslitkoka','Pusat Penelitian Kopi dan Kakao Indonesia'],['P3GI','Pusat Penelitian Perkebunan Gula Indonesia'],
  ['PPTK','Pusat Penelitian Teh dan Kina'],['PPBBI','Pusat Penelitian Bioteknologi dan Bioindustri Indonesia'],['Puslit Karet','Pusat Penelitian Karet'],
  ['Div. Operasional Riset','Divisi Operasional Riset'],['Div. Komersial','Divisi Pemasaran & Komersialisasi'],['Div. Keuangan','Divisi Keuangan'],
  ['Div. SDM','Divisi SDM'],['Div. Hukum','Divisi Hukum'],['Div. Pengadaan','Divisi Pengadaan']
];
export const divName=k=>{const d=DIVISI.find(x=>x[0]===k);return d?d[1]:(k||'—')};
export const ASPEK=[
  ['a1','Kesesuaian dengan kebutuhan','Hasil kajian menjawab pertanyaan atau kebutuhan yang diajukan divisi Anda.'],
  ['a2','Kualitas data dan analisis','Data yang dipakai memadai dan analisisnya dapat dipertanggungjawabkan.'],
  ['a3','Kejelasan rekomendasi','Rekomendasi mudah dipahami dan dapat langsung ditindaklanjuti.'],
  ['a4','Kecepatan penyelesaian','Waktu yang dibutuhkan sampai hasil kajian diterima.'],
  ['a5','Manfaat bagi divisi','Hasil kajian berguna bagi pekerjaan atau keputusan di divisi Anda.']
];
export const ROLES={admin:'Admin Sekretariat',anggota:'Anggota TKIN',direksi:'Direksi'};
export const ROLENOTE={
  admin:'Bisa menambah, mengubah, memindahkan tahap, membuat link survei, dan mengekspor. Di versi jadi, admin masuk dengan kode akses.',
  anggota:'Semua data terlihat, tanpa tombol ubah dan tanpa menu ekspor.',
  direksi:'Melihat posisi kajian, hasil, rekomendasi, dan kepuasan pemohon. Data operasional sekretariat disembunyikan.'
};
export const BLN=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
export const BLN_P=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
export const HARI=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
export const ROM=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
export const PIC=['Dr. Andi Wiratama','Ir. Sari Lestari, M.Si.','Budi Santoso, S.E., M.M.','Rina Maharani, S.H.','Dr. Hendra Gunawan','Dewi Puspitasari, S.Ak.'];


/* ================= Data contoh kajian ================= */
// Hanya untuk prototipe. Di versi jadi, data dibaca dari database (mis. Google Sheets).
export const SEED=[
 {j:'Kajian Penetapan Harga Benih Kelapa Sawit Unggul Tahun 2027',t:'Harga Produk Hasil Riset',pm:'PPKS',s:'Direktur Utama',d:'2026-02-09',tp:7,p:0,kep:'Diterima dengan catatan',rek:'Harga benih dinaikkan bertahap mengikuti kenaikan biaya produksi, dengan harga khusus untuk pekebun rakyat.',tl:'SK Direksi tentang harga benih 2027 (contoh)'},
 {j:'Kajian Tarif Layanan Analisis Laboratorium Tanah dan Daun',t:'Harga Produk Hasil Riset',pm:'Div. Komersial',s:'Direktur Riset, Inovasi, dan Sustainability',d:'2026-03-02',tp:7,p:2,kep:'Diterima',rek:'Tarif disusun per paket analisis, dengan potongan untuk mitra kerja sama jangka panjang.',tl:'Daftar tarif laboratorium berlaku 1 Juli 2026 (contoh)'},
 {j:'Kajian Kebijakan Insentif Royalti bagi Inventor Hasil Riset',t:'Kebijakan Internal',pm:'Div. Operasional Riset',s:'Direktur Utama',d:'2026-03-16',tp:6,p:3,g:[14,20,30,25,20,20],rek:'Inventor menerima bagian royalti berupa persentase dari penerimaan bersih lisensi, dibayarkan setiap tahun.'},
 {j:'Kajian Harga Jual Bibit Kakao Klonal',t:'Harga Produk Hasil Riset',pm:'Puslitkoka',s:'Direktur Komersial',d:'2026-04-06',tp:7,p:1,kep:'Dikaji ulang',rek:'Harga dibedakan menurut umur bibit dan volume pembelian.',tl:'Direksi meminta tambahan perbandingan harga pasar regional'},
 {j:'Kajian Kebijakan Kerja Sama Riset dengan Mitra Swasta',t:'Kebijakan Internal',pm:'Div. Komersial',s:'Direktur Riset, Inovasi, dan Sustainability',d:'2026-04-20',tp:5,p:4,g:[14,25,35,30,40],tgt:'2026-12-15'},
 {j:'Kajian Review SOP Pengadaan Bahan dan Alat Penelitian',t:'SOP & Instruksi Kerja',pm:'Div. Pengadaan',s:'Direktur Keuangan',d:'2026-05-11',tp:4,p:5,g:[14,30,35,40]},
 {j:'Kajian Kelayakan Lahan Kebun Percobaan Baru',t:'Kelayakan Usaha & Lahan',pm:'PPKS',s:'Direktur Riset, Inovasi, dan Sustainability',d:'2026-05-18',tp:7,p:4,g:[10,15,20,15,10,10,14],kep:'Diterima',rek:'Lahan calon kebun percobaan layak dengan syarat perbaikan drainase pada blok rendah sebelum penanaman.',tl:'Persetujuan Direksi untuk proses sewa lahan (contoh)'},
 {j:'Kajian Harga Bibit Tebu Varietas Unggul Musim Tanam 2027',t:'Harga Produk Hasil Riset',pm:'P3GI',s:'Direktur Komersial',d:'2026-06-01',tp:6,p:0,g:[10,15,20,15,10,12],rek:'Harga bibit ditetapkan per kuintal, dengan penyesuaian ongkos angkut per wilayah.'},
 {j:'Kajian Kebijakan Pemanfaatan Kebun Percobaan oleh Pihak Ketiga',t:'Kebijakan Internal',pm:'Div. Operasional Riset',s:'Direktur Utama',d:'2026-06-22',tp:3,p:4,g:[20,30,35],tgt:'2026-12-31'},
 {j:'Kajian Skema Tarif Pelatihan dan Bimbingan Teknis',t:'Harga Produk Hasil Riset',pm:'Div. SDM',s:'Direktur Riset, Inovasi, dan Sustainability',d:'2026-07-13',tp:2,p:2,g:[25,40]},
 {j:'Kajian Review Instruksi Kerja Pengelolaan Sampel Laboratorium',t:'SOP & Instruksi Kerja',pm:'PPBBI',s:'Direktur Riset, Inovasi, dan Sustainability',d:'2026-08-03',tp:7,p:5,g:[7,8,9,7,5,6,10],kep:'Diterima',rek:'IK diperbarui dengan alur pelabelan dan penyimpanan sampel yang seragam di semua pusat penelitian.',tl:'IK disahkan dan disosialisasikan (contoh)'},
 {j:'Kajian Kebijakan Pengelolaan Kekayaan Intelektual Perusahaan',t:'Kebijakan Internal',pm:'Div. Hukum',s:'Direktur Utama',d:'2026-08-24',tp:2,p:3,g:[15,20],sk:'Ditunda'},
 {j:'Kajian Harga Produk Pupuk Hayati Hasil Riset',t:'Harga Produk Hasil Riset',pm:'PPBBI',s:'Direktur Komersial',d:'2026-09-14',tp:1,p:1,g:[21],tgt:'2027-01-15'},
 {j:'Kajian Kebijakan Perjalanan Dinas Kegiatan Riset Lapangan',t:'Kebijakan Internal',pm:'Div. Keuangan',s:'Direktur Keuangan',d:'2026-10-05',tp:1,p:3,g:[14]},
 {j:'Kajian Harga Biofungisida Berbasis Agens Hayati',t:'Harga Produk Hasil Riset',pm:'PPBBI',s:'Direktur Komersial',d:'2026-10-26',tp:0,p:0},
 {j:'Kajian Review SOP Komersialisasi Produk Hasil Riset',t:'SOP & Instruksi Kerja',pm:'Div. Komersial',s:'Direktur Komersial',d:'2026-11-09',tp:0,p:5},
 {j:'Kajian Harga Klon Teh Unggul Tahun 2026',t:'Harga Produk Hasil Riset',pm:'PPTK',s:'Direktur Komersial',d:'2025-10-13',tp:7,p:2,kep:'Diterima',rek:'Harga klon ditetapkan per batang setek, dengan potongan untuk kebun mitra.',tl:'SK Direksi tentang harga klon 2026 (contoh)'}
];
