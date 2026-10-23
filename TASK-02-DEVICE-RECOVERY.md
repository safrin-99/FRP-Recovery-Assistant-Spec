# TASK 02 — IMPLEMENT REAL DEVICE RECOVERY OPERATIONS

**Proyek:** FRP Recovery Assistant  
**Target:** Windows desktop  
**Gunakan setelah:** Task 01 / project orientation selesai dan hasil audit awal tersedia.

## Instruksi kepada Claude Code

Lanjutkan dari implementasi repository saat ini. Jangan membuat ulang proyek dari nol, jangan menghapus perubahan yang sudah selesai, dan jangan mengulang migrasi Supabase sebelum memeriksa status database serta riwayat migrasinya.

Sebelum mengubah kode, baca `CLAUDE.md`, `PRD.md`, `DESIGN.md`, `SUPABASE_SETUP.md`, `README.md`, dan `reference-ui.png`. Jika laporan Task 01 tersedia, gunakan laporan tersebut. Periksa `git status` dan diff terlebih dahulu agar perubahan yang belum di-commit tidak tertimpa.

## Tujuan produk

FRP Recovery Assistant harus menjadi alat kerja teknisi servis HP Windows yang melakukan diagnosis nyata dan menjalankan operasi pemulihan langsung **hanya jika tersedia metode resmi, terdokumentasi, kompatibel, dan dapat diuji**. Jangan berhenti pada UI, simulasi, checklist, atau tautan panduan jika operasi resmi memang dapat dijalankan melalui antarmuka yang didukung.

Target operasional untuk pelanggan yang menyetujui kehilangan data adalah membantu perangkat kembali dapat digunakan melalui prosedur reset resmi. Aplikasi tidak boleh menjanjikan bahwa semua PIN/pola bisa dibuka, bahwa data selalu bisa dipertahankan, atau bahwa reset pasti menghilangkan FRP.

## 1. Audit implementasi saat ini

Periksa dan laporkan status nyata untuk:

- Screen Lock Recovery engine dan guide resolver.
- Katalog metode resmi serta allowlist backend Rust.
- Deteksi USB, ADB, Fastboot, dan status perangkat.
- Integrasi Supabase, Auth, RLS, serta tabel `recovery_cases`.
- Pencatatan tiket, izin pemilik, dan persetujuan kehilangan data.
- Log dan status UI yang harus mencerminkan hasil operasi nyata.
- Tes, typecheck, lint, build Windows, serta artefak installer yang tersedia.

Pisahkan secara eksplisit: **operasi benar-benar dijalankan**, **hanya panduan/manual**, **simulasi/demo**, dan **belum tersedia/belum diuji**. Jangan menyimpulkan fitur bekerja hanya karena tombol atau halaman tersedia.

## 2. Bangun capability matrix

Buat matriks berdasarkan merek/model yang dapat diidentifikasi, versi sistem bila tersedia, mode koneksi, prasyarat, dokumentasi resmi, dampak data, dan cara memverifikasi hasil. Jangan mengklaim dukungan model yang belum diverifikasi.

Prioritaskan operasi berikut:

### A. Diagnosis perangkat nyata

- Deteksi koneksi dan status ADB/Fastboot dengan tools resmi yang valid.
- Tampilkan sumber dan waktu informasi yang terdeteksi.
- Tangani perangkat tidak ditemukan, akses ditolak, mode tidak didukung, timeout, dan output yang tidak dikenal.
- Jangan mengubah status menjadi `Device Ready` berdasarkan data demo atau status kedaluwarsa.

### B. Official Factory Reset

- Tambahkan operasi reset langsung hanya untuk kasus di mana metode resmi dan dokumentasinya secara eksplisit mendukung eksekusi tersebut dari komputer.
- Jika prosedur yang benar memerlukan tombol fisik atau interaksi layar perangkat, tampilkan langkah yang spesifik untuk model/mode; jangan berpura-pura reset dilakukan langsung oleh aplikasi.
- Jangan membuat satu perintah generic yang dikirim ke semua perangkat. Jangan menganggap ADB tersedia atau authorized saat perangkat terkunci.
- Sebelum tindakan penghapusan data, jalankan preflight dan minta persetujuan eksplisit untuk tiket serta perangkat yang benar.
- Setelah operasi, verifikasi menggunakan bukti yang tersedia. Keberhasilan mengirim perintah tidak sama dengan keberhasilan reset.

### C. Screen Lock Recovery tanpa kehilangan data

- Periksa hanya opsi sah dan terdokumentasi yang kompatibel dengan perangkat dan status akses saat ini.
- Jika metode non-destruktif tidak tersedia atau belum dapat diverifikasi, nyatakan hal itu secara eksplisit dan tawarkan eskalasi/panduan resmi.
- Jangan membuat klaim bahwa aplikasi dapat menghapus/mengganti PIN, pola, atau sandi pada setiap perangkat tanpa kredensial lama.

### D. Aktivasi setelah reset

- Beri tahu teknisi bahwa Google FRP atau verifikasi akun Xiaomi mungkin tetap muncul setelah reset.
- Jika akun terdahulu dibutuhkan, arahkan pemilik ke pemulihan akun resmi. Jangan menyediakan bypass atau cara menghindari verifikasi anti-pencurian.
- Sesudah perangkat berhasil diaktivasi dan diakses secara sah, pandu pelanggan untuk menetapkan PIN/pola/sandi baru langsung pada perangkat.

## 3. Safety gates untuk operasi destruktif

Sebelum operasi reset:

1. Pastikan identitas perangkat berasal dari hasil deteksi yang nyata, bukan data mock.
2. Tampilkan merek/model dan identitas perangkat yang tersedia, tanpa membocorkan data sensitif ke log/cloud.
3. Tampilkan peringatan jelas bahwa data lokal akan dihapus dan FRP/akun terdahulu mungkin masih diperlukan.
4. Rekam persetujuan eksplisit pelanggan per tiket/perangkat; jangan mengasumsikan persetujuan berdasarkan kebiasaan pelanggan lain.
5. Tolak operasi jika identitas, metode resmi, prasyarat, atau persetujuan belum terpenuhi.
6. Catat status awal, siapa yang menyetujui (sejauh data yang diperlukan), operasi, waktu, hasil, dan alasan kegagalan ke `recovery_cases` sesuai RLS.

Gunakan Rust command allowlist, argumen terpisah yang divalidasi, timeout, pembatalan bila aman, output caps, dan sanitasi log. Jangan membuat API seperti `run_command(command: string)`, `run_arbitrary_shell`, atau memberi AI kemampuan menjalankan shell/perintah perangkat bebas.

## 4. Supabase

- Periksa status migration sebelum menerapkan apa pun; jangan mengulang atau memodifikasi migration historis yang sudah diterapkan tanpa strategi migration baru.
- Pastikan autentikasi dan RLS melindungi setiap row; satu akun tidak boleh membaca/mengubah kasus akun lain.
- Simpan hanya informasi servis dan hasil yang disanitasi. Jangan pernah menyimpan PIN, pola rahasia, kata sandi, OTP, recovery code, token, cookie, atau kredensial akun pelanggan.
- Jika Supabase offline/gagal, jangan berpura-pura catatan sudah tersimpan. Tampilkan status jelas dan gunakan fallback lokal yang sudah didefinisikan di spesifikasi jika tersedia.

## 5. Pengujian wajib

Tambahkan unit/integration tests untuk:

- Perangkat terdeteksi dan tidak terdeteksi.
- Model/mode yang tidak didukung.
- Consent reset belum ada, dibatalkan, atau terkait tiket/perangkat yang berbeda.
- Metode operasi tidak tersedia atau prasyarat tidak terpenuhi.
- Perintah gagal, timeout, output tak dikenal, dan pembatalan.
- Status operasi hanya berubah menjadi sukses setelah ada bukti verifikasi.
- Supabase error/offline, signed-out access, dan RLS two-user isolation.
- Redaksi data sensitif.
- Tidak ada alur yang mengklaim bypass FRP atau membuka PIN secara universal.

Gunakan mock untuk tes terisolasi. Jalankan tes perangkat nyata hanya jika perangkat yang sesuai benar-benar tersedia dan disetujui untuk pengujian. Jangan menyatakan perangkat nyata berhasil diuji jika hanya menggunakan mock.

## 6. Batas desain dan cakupan

- Pertahankan Tauri 2 + Rust + React + TypeScript + Vite + Tailwind, kecuali ada blocker yang dibuktikan dan perubahan disetujui.
- Pertahankan Supabase sebagai database cloud utama.
- Semua dropdown tetap custom-styled; jangan menggunakan dropdown native browser.
- Pertahankan visual yang disepakati dan referensi `reference-ui.png`; jangan membuat ulang dashboard sebagai template generik.
- Semua tombol harus memicu aksi nyata atau dinonaktifkan dengan alasan yang jelas. Jangan gunakan demo data untuk menyiratkan perangkat sungguhan berhasil didiagnosis.

## 7. Laporan akhir

Setelah implementasi bertahap, laporkan:

1. Operasi yang benar-benar dapat dijalankan dari aplikasi.
2. Operasi yang masih memerlukan tindakan fisik teknisi.
3. Merek/model dan mode yang telah diuji, bila ada.
4. Hasil tes, typecheck, lint, build, serta lokasi artefak yang telah diverifikasi.
5. Masalah yang tersisa dan alasan teknisnya.
6. Fitur yang masih berupa panduan, mock, atau belum didukung.
7. Status migration serta tes RLS Supabase.

Jangan mengklaim fitur selesai tanpa bukti. Lakukan perubahan dalam tahap-tahap kecil, periksa diff, dan jangan menimpa perubahan pengguna yang belum di-commit.
