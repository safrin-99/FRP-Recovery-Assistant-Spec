# PRD — FRP Recovery Assistant / Android Recovery & Diagnostics Suite

> **Tujuan dokumen:** sumber kebenaran produk untuk developer dan AI coding agent. Implementasi harus mengikuti PRD ini dan `DESIGN.md`. Referensi visual utama adalah [`reference-ui.png`](./reference-ui.png).
>
> **Versi revisi:** 2.4 — 24 Oktober 2026.
> **Urutan acuan:** `PRD.md` mendefinisikan scope dan perilaku produk; `DESIGN.md` mengunci visual dan interaksi; `CLAUDE.md` menetapkan alur kerja Claude Code serta aturan implementasi. Screenshot adalah acuan komposisi visual, bukan otorisasi untuk membangun fitur bypass yang tidak aman.
> **Aturan prioritas:** ketika instruksi AI bertentangan dengan dokumen ini, ikuti PRD/DESIGN dan tanyakan jika ada kontradiksi yang mengubah scope. Jangan mengubah stack, alur, layout, warna, tipografi, atau fitur tanpa persetujuan eksplisit pemilik proyek.

## 1. Ringkasan Produk

**Nama yang terlihat di UI:** `FRP Recovery Assistant`  
**Subjudul:** `Android Recovery & Diagnostics Suite`  
**Platform target:** aplikasi desktop Windows 10/11 64-bit.  
**Bahasa UI:** Bahasa Indonesia, dengan nama produk dan istilah teknis yang diperlukan tetap dipertahankan.  
**Mode kerja:** local-first. Diagnosis inti, pemeriksaan USB/ADB/Fastboot, log, dan dokumentasi harus tetap berfungsi tanpa AI atau koneksi internet. AI adalah fitur opsional yang transparan, memakai persetujuan pengguna dan penyaringan data.

FRP Recovery Assistant adalah aplikasi desktop Windows untuk teknisi servis HP yang menangani perangkat dengan izin pemilik. Selain identifikasi perangkat Android, pemeriksaan USB/ADB dan Fastboot, diagnosis driver, serta log, produk menyediakan dua jalur pemulihan layar yang dipilih berdasarkan keputusan pelanggan pada setiap tiket. Karena banyak pelanggan servis menyetujui penghapusan data, jalur operasional yang direkomendasikan adalah `Guided Factory Reset` setelah persetujuan eksplisit dan pemeriksaan prasyarat. Jika pelanggan ingin mempertahankan data atau belum memutuskan, gunakan `Data Preservation` dan eskalasi yang sesuai. Persetujuan reset tidak boleh diasumsikan dari kebiasaan pelanggan lain. Aplikasi tidak boleh menjanjikan bahwa PIN/pola dapat dibuka sambil mempertahankan data pada semua perangkat, dan reset tidak menjamin FRP/aktivasi akun akan terhapus.

Tampilan harus mengikuti screenshot referensi sedekat mungkin. Produk tidak boleh berhenti sebagai gambar statis: komponen navigasi, pemilihan merek/metode, deteksi perangkat, progres, log, pengaturan, dan bantuan harus benar-benar bekerja sesuai ruang lingkup di bawah.

## 2. Tujuan Produk

1. Menghasilkan aplikasi Windows dengan kualitas visual setara screenshot referensi.
2. Memberi teknisi satu tempat untuk melihat status koneksi, informasi perangkat yang tersedia, hasil diagnosis, dan riwayat log.
3. Membantu membedakan masalah kabel, driver, ADB authorization, Fastboot detection, dan kondisi perangkat yang tidak dapat dibaca.
4. Menyediakan panduan pemulihan akun dan dukungan resmi tanpa mengumpulkan kata sandi atau kredensial akun.
5. Menyediakan alur Screen Lock Recovery yang mengikuti pilihan setiap pelanggan: jika kehilangan data disetujui secara eksplisit, prioritaskan panduan factory reset resmi setelah preflight; jika data harus dipertahankan atau pelanggan belum memutuskan, jalankan Data Preservation dan eskalasi bila perlu.
6. Menghadirkan AI Assistant opsional yang menjelaskan log, membantu triase, dan menyusun langkah aman berdasarkan data yang benar-benar tersedia.
7. Menggunakan dropdown/combobox visual yang konsisten, bukan popup native browser yang tidak selaras dengan desain.
8. Mencatat tiket pemulihan, jalur yang dipilih, persetujuan reset, dan hasil yang sudah disanitasi ke Supabase.
9. Menjadi dasar kode yang modular, teruji, mudah dirawat, serta mudah diteruskan melalui Claude Code berdasarkan `CLAUDE.md`.

## 3. Batas Ruang Lingkup dan Keamanan

### Termasuk

- Deteksi perangkat Android yang terlihat melalui alat resmi Android SDK Platform-Tools.
- Pembacaan informasi non-sensitif yang memang tersedia pada koneksi yang sah.
- Diagnosis status USB, ADB, dan Fastboot; bantuan pemeriksaan driver; dan instruksi troubleshooting.
- Riwayat diagnosis dan log tersanitasi yang dapat disimpan ke Supabase setelah persetujuan, log sesi aktif, ekspor lokal, dan pengaturan aplikasi.
- Panduan pemulihan akun Google/perangkat resmi sesuai dukungan produsen.
- Mode demo untuk preview UI ketika perangkat belum tersambung.
- Halaman `Screen Lock Recovery` yang sejak intake meminta preferensi pelanggan: `Setuju hapus data untuk mencoba memulihkan penggunaan`, `Data harus dipertahankan`, atau `Belum memutuskan`.
- Jalur `Guided Factory Reset` menjadi jalur operasional yang disarankan ketika pelanggan secara eksplisit menyetujui penghapusan data, setelah identifikasi perangkat, peringatan kehilangan data, pemeriksaan kesiapan akun Google/Xiaomi pasca-reset, dan persetujuan terdokumentasi. MVP memandu prosedur resmi yang sesuai model; tidak melakukan generic one-click wipe/flash dari komputer.
- Jalur `Data Preservation` untuk pelanggan yang meminta data dipertahankan atau belum menyetujui reset; mencakup pemeriksaan akses yang sah, backup yang mungkin tersedia, batasan teknis, dan eskalasi layanan resmi.
- Tiket pemulihan yang menyimpan status kasus, prioritas data, status backup, jalur pemulihan, catatan persetujuan reset, dan ringkasan hasil tersanitasi di Supabase.
- AI Assistant opsional untuk menjelaskan hasil diagnosis/log yang telah disanitasi, memandu triase dua jalur, dan merujuk dokumentasi resmi.
- Pengaturan provider AI yang transparan; fungsi inti tetap tersedia tanpa provider AI.

### Tidak termasuk

- Eksploitasi kerentanan atau instruksi untuk menonaktifkan/melewati Factory Reset Protection (FRP) tanpa otorisasi.
- Pengambilan, penyimpanan, atau pengiriman kata sandi, token, cookie, atau kredensial akun Google.
- Menyamar sebagai layanan resmi Google atau produsen perangkat.
- Menjalankan perintah shell bebas yang diketik dari UI, payload arbitrer, atau skrip yang diunduh dari sumber tak tepercaya.
- Operasi test-point, exploit, patched firmware, atau pengubahan sistem untuk menghindari perlindungan anti-pencurian.
- AI yang menjalankan perintah perangkat atau shell secara otonom, mengubah sistem, membuka PIN, menghapus data, atau melewati FRP. AI hanya memberi saran dan penjelasan.
- Mengirim log atau informasi perangkat ke layanan AI/cloud secara diam-diam.
- Menaruh API key atau secret provider pada frontend, repository, berkas konfigurasi publik, atau installer.
- Menjalankan wipe/factory reset, unlock bootloader, flashing, atau penghapusan data secara otomatis/generik dari komputer pada MVP. Reset tersedia sebagai alur terpandu yang mengarahkan teknisi ke prosedur resmi dan memerlukan tindakan fisik/persetujuan yang sesuai. Eksekusi berbasis perangkat hanya dapat ditambahkan melalui perubahan scope terpisah, allowlist yang terdokumentasi, preflight, konfirmasi eksplisit, dan pengujian per model.

> **Prioritas teks operasional:** gunakan nama `FRP Recovery Assistant` dan istilah `FRP Recovery`/`Mulai Diagnosis FRP`. `reference-ui.png` adalah rujukan komposisi, proporsi, warna, dan nuansa visual; teks lama yang menjanjikan bypass bukan spesifikasi fitur. Jangan menjanjikan bypass/unlock yang tidak dilakukan aplikasi.

## 4. Pengguna Sasaran

- Teknisi servis yang menangani perangkat dengan izin pemilik.
- Pemilik perangkat yang membutuhkan panduan pemulihan akun resmi.
- Staf servis yang perlu membuat laporan hasil diagnosis USB/ADB.

## 5. Platform dan Stack yang Dipatok

- **Desktop shell:** Tauri 2.
- **Frontend:** React + TypeScript + Vite.
- **Styling:** Tailwind CSS 4 dengan CSS custom properties sebagai design tokens.
- **Icons:** Lucide React; ikon khusus brand hanya dari aset yang diizinkan atau pengganti tipografi sederhana.
- **State UI:** Zustand untuk state lintas halaman; state lokal React untuk kontrol sederhana.
- **Validasi:** Zod untuk validasi input dan konfigurasi.
- **Dropdown custom:** Radix UI Select/primitive aksesibel yang distyling dengan design tokens. Semua popup pilihan harus konsisten secara visual; tidak boleh menampilkan dropdown native browser. Combobox pencarian memakai pola aksesibel yang sesuai, bukan `<select>` standar.
- **Backend native:** Rust stable toolchain yang dikunci pada project/CI.
- **Android tooling:** Android SDK Platform-Tools resmi (ADB/Fastboot). Aplikasi harus memeriksa instalasi/sumber binary; tidak boleh mengunduh lalu mengeksekusi binary yang tidak diverifikasi.
- **Database utama wajib:** Supabase (PostgreSQL terkelola) melalui `@supabase/supabase-js` dan HTTPS Data API/Auth. Supabase adalah sumber kebenaran untuk riwayat diagnosis cloud, profil, preferensi tersinkron, dan percakapan AI yang secara eksplisit disimpan pengguna. Akses dibatasi dengan Supabase Auth + Row Level Security (RLS) pada setiap tabel. Tidak boleh ada secret/service-role key di aplikasi desktop. Diagnosis perangkat lokal tetap dapat berjalan tanpa login/internet, tetapi penyimpanan cloud membutuhkan koneksi internet dan pengguna yang masuk. Pada kondisi offline, jangan mengklaim data telah tersimpan; pertahankan log pada sesi aktif dan sediakan ekspor lokal. SQLite bukan database utama dan tidak wajib pada MVP.
- **AI integration:** `AiProvider` adapter terpisah dari UI dan service diagnosis; provider dinonaktifkan secara default sampai konfigurasi/consent tersedia. AI tidak menjadi dependensi diagnosis inti. Jangan menganggap Claude Code sebagai provider AI runtime aplikasi.
- **Unit/UI tests:** Vitest + React Testing Library.
- **End-to-end UI tests:** Playwright untuk alur desktop/web UI yang dapat diuji otomatis; verifikasi USB nyata tetap memerlukan perangkat fisik.
- **Build installer:** Tauri bundler untuk Windows.

Gunakan versi stabil yang kompatibel pada saat implementasi dan commit `package-lock.json`/lockfile Rust. Jangan menaikkan major version di tengah pekerjaan tanpa mengevaluasi dampak dan menjalankan ulang seluruh test.

## 6. Arsitektur Tingkat Tinggi

```text
React UI (dashboard, custom dropdowns, AI chat, status, logs)
        │
        ▼
Tauri IPC — API spesifik yang diizinkan
        │
        ▼
Rust service layer
  ├── Device discovery
  ├── ADB/Fastboot adapter (allowlist perintah)
  ├── Driver diagnostics
  ├── Screen Lock Recovery decision engine (per-customer consent; reset-first only when approved)
  ├── Guided Factory Reset preflight + official guide resolver (no generic automatic wipe)
  ├── Recovery case service (owner authorization + consent metadata)
  ├── Recovery guide links
  ├── Logging / redaction
  ├── Supabase data-access layer (`@supabase/supabase-js`)
  │    ├── Supabase Auth (opsional untuk diagnosis lokal; wajib untuk cloud data)
  │    ├── PostgreSQL tables + migrations
  │    ├── RLS policies per user; no cross-account access
  │    └── profile / settings / diagnosis history / sanitized logs
  └── Optional AI Assistant service
       ├── Consent + context sanitizer
       ├── Provider adapter / timeout / limits
       └── No autonomous device commands
        │
        ├── Android SDK Platform-Tools terverifikasi (lokal)
        ├── Supabase cloud database (internet diperlukan untuk cloud sync)
        └── AI provider opsional (hanya setelah consent; konteks disanitasi)
```

### Aturan backend

- Jangan menyediakan command seperti `run_arbitrary_command(command: string)`.
- Gunakan fungsi Rust spesifik, misalnya `detect_devices`, `get_device_summary`, `run_connection_diagnostics`, `get_diagnostic_logs`, dan `open_official_recovery_guide`.
- Semua argumen divalidasi di Rust walaupun frontend sudah memakai Zod.
- Argumen proses dikirim sebagai array argumen terpisah; jangan membangun command shell melalui string concatenation.
- Terapkan timeout, pembatalan proses, batas ukuran output, penanganan exit code, dan redaksi informasi sensitif.
- Batasi Tauri capabilities ke permission yang diperlukan. Jangan memberikan akses shell, filesystem, atau remote URL secara luas hanya demi kemudahan.
- Jangan menyimpan serial/identifier perangkat jika tidak diperlukan untuk diagnosis; jika disimpan, jelaskan di UI dan sediakan penghapusan.
- Tidak ada telemetri jaringan secara default. Setiap fitur jaringan di masa depan harus dijelaskan dan meminta persetujuan.
- AI hanya mengirim konteks yang diperlukan setelah pengguna melihat data yang akan dibagikan dan menyetujuinya. Redaksi identifier perangkat, path pengguna, dan informasi pribadi secara default.
- AI tidak boleh memanggil shell bebas atau menyusun perintah bebas untuk dieksekusi. Jika di masa depan ada tool action, ia harus berupa fungsi allowlist yang ditentukan developer, divalidasi backend, dan mendapat konfirmasi manusia sebelum dijalankan. Pada MVP, AI hanya menjelaskan/menyarankan.

## 7. Peta Navigasi dan Halaman

Sidebar harus mengikuti urutan berikut:

1. Home
2. Screen Lock Recovery
3. FRP Recovery
4. AI Assistant
5. Device Info
6. Flash / Factory Reset
7. Tools
8. Drivers
9. Logs
10. Settings

Header atas: logo perisai, nama aplikasi, subjudul, Settings, Logs, Help, dan kontrol jendela Windows.

### 7.1 Home

- Hero/banner atas dengan judul, subjudul, 3 benefit icon, dan ilustrasi dua ponsel.
- Panel pemilihan metode berisi 4 kartu.
- Panel pilihan merek Android.
- Tombol aksi utama.
- Panel kanan Informasi Perangkat.
- Panel kanan Progress dan log terbaru.
- Kartu status koneksi di bagian bawah sidebar.

### 7.2 Screen Lock Recovery

Halaman ini menangani keluhan lupa PIN/pola/sandi layar dan harus membedakan kunci layar dari App Lock/Privacy Lock, lupa akun Google, dan FRP setelah reset.

**Case intake dan keputusan pelanggan:**
- Konfirmasi teknisi menangani perangkat dengan izin pemilik. Catat otorisasi umum dan persetujuan kehilangan data secara terpisah.
- Minta pelanggan memilih salah satu: `Setuju hapus data`, `Data harus dipertahankan`, atau `Belum memutuskan`. Default UI tidak boleh mengasumsikan persetujuan.
- Catat status backup: `Belum diperiksa`, `Tersedia dan terverifikasi`, `Sebagian`, `Tidak ada`, atau `Tidak diketahui`. Jangan meminta PIN/pola, kata sandi, OTP, atau recovery code.
- Tanyakan secara verbal/di hadapan teknisi apakah pelanggan dapat masuk ke akun Google/Xiaomi yang sebelumnya terikat setelah reset. Aplikasi hanya menyimpan status kesiapan akun (misalnya `siap`, `perlu pemulihan`, `tidak diketahui`), bukan email, username, atau kata sandi.

**Jalur A — Guided Factory Reset (jalur operasional yang disarankan ketika pelanggan menyetujui kehilangan data):**
- Jalur ini menjadi pilihan utama hanya setelah pelanggan secara eksplisit menyetujui penghapusan data untuk tiket/perangkat yang sedang ditangani.
- Preflight wajib: izin pemilik terkonfirmasi; model/merek diverifikasi atau ditandai belum diketahui; kehilangan data lokal dijelaskan; backup ditinjau atau pelanggan menyatakan data boleh hilang; status kesiapan akun Google/Xiaomi dibahas; potensi FRP/aktivasi setelah reset dijelaskan; persetujuan reset dan versi teks persetujuan dicatat.
- Jika akun Google/Xiaomi yang mungkin diperlukan tidak diketahui, tampilkan peringatan kuat dan rekomendasikan pemulihan akun resmi sebelum reset. Jangan mengklaim perangkat dapat langsung dipakai setelah wipe.
- Buka panduan resmi yang sesuai merek/model. Untuk MVP, teknisi menjalankan reset secara fisik pada perangkat mengikuti instruksi resmi; aplikasi tidak melakukan generic one-click wipe/flash dari komputer dan tidak menjalankan command destruktif dari AI.
- Setelah reset, pandu setup awal, aktivasi dengan akun yang sebelumnya terikat jika diminta, dan pemulihan backup yang tersedia. Setelah perangkat berhasil diaktifkan, pelanggan menetapkan PIN/pola baru langsung di perangkat.
- Hasil hanya boleh menjadi `Berhasil diverifikasi` setelah teknisi benar-benar memastikan perangkat melewati setup/aktivasi. Jika diminta kredensial akun yang tidak tersedia, hasilnya `Menunggu pemulihan akun`, bukan `Unlocked`.

**Jalur B — Data Preservation (untuk pelanggan yang ingin mempertahankan data atau belum memutuskan):**
- Tampilkan banner: `Data harus dipertahankan — jangan reset/flash sebelum pemeriksaan dan keputusan pelanggan selesai.`
- Lakukan pemeriksaan read-only dan opsi resmi yang mungkin masih tersedia, seperti akses sah yang masih bekerja atau backup/sinkronisasi yang dapat diverifikasi. Jangan lakukan percobaan PIN/pola otomatis, write operation, wipe, flashing, atau unlock bootloader.
- Jika tidak ada metode resmi/non-destruktif yang terverifikasi, jelaskan batasannya dan berikan opsi layanan resmi. Jangan menjanjikan universal unlock atau akses ke data terenkripsi.
- Reset baru boleh dibuka jika pelanggan mengubah keputusan dan memberikan persetujuan eksplisit yang baru dicatat.

**Pencatatan kasus:**
- Simpan merek/model, jenis masalah, preferensi data, status backup, status kesiapan akun pasca-reset, otorisasi pemilik, persetujuan reset, jalur yang dipilih, dan ringkasan hasil tersanitasi di `recovery_cases`.
- Jangan menyimpan PIN, pola, kata sandi, OTP, recovery code, isi data pribadi, atau kredensial akun.

### 7.3 FRP Recovery

- Menjelaskan keadaan verifikasi/perlindungan yang dapat diketahui secara sah.
- Menyediakan jalur bantuan pemulihan akun resmi dan dokumentasi produsen.
- Jika status FRP tidak dapat diinspeksi oleh alat yang tersedia, tampilkan `Tidak dapat diverifikasi melalui koneksi ini`, bukan menebak status.
- Tidak ada tombol atau skrip untuk mengeksploitasi maupun menonaktifkan FRP.

### 7.4 AI Assistant

- Halaman khusus percakapan AI yang membantu menjelaskan diagnosis, menginterpretasi log yang sudah disanitasi, dan memandu langkah pemulihan aman.
- AI Assistant bukan tool bypass dan tidak dapat membuka PIN/pola, mendekripsi data, atau menjamin pemulihan akses.
- Input awal dapat memuat konteks diagnosis saat ini, tetapi hanya data minimum dan setelah pengguna menyetujui pengiriman ke provider jika provider cloud digunakan.
- Tampilkan label sumber konteks: `Terdeteksi`, `Dari pengguna`, `Dugaan`, atau `Tidak diketahui`. Jangan menyatakan status FRP jika tidak bisa dibuktikan.
- Jawaban AI harus memisahkan `Temuan`, `Langkah aman berikutnya`, `Risiko`, dan `Sumber resmi` bila relevan.
- Berikan peringatan untuk tindakan yang mungkin menghapus data. AI tidak boleh menjalankan command atau operasi perangkat secara langsung.
- Jika AI/provider tidak tersedia, tampilkan error yang jelas dan tetap sediakan diagnosis/manual help.
- Riwayat percakapan disimpan ke Supabase hanya jika pengguna secara eksplisit mengaktifkannya; pengguna dapat menghapusnya. Default simpan riwayat AI: nonaktif.

### 7.5 Device Info

- Brand, model, model code, versi Android, patch keamanan bila tersedia, jenis koneksi, dan status otorisasi ADB/Fastboot.
- Field yang belum diketahui harus menampilkan `—` / `Tidak tersedia`.
- Jangan mengisi informasi statis dari perangkat demo pada sesi perangkat nyata.

### 7.6 Flash / Factory Reset

- Sediakan `Guided Factory Reset` berbasis petunjuk resmi merek/model yang telah terverifikasi, dengan preflight, penjelasan dampak data, cek kesiapan akun Google/Xiaomi, dan catatan persetujuan pemilik.
- MVP tidak menjalankan generic one-click wipe, unlock bootloader, atau flashing dari komputer. Jangan menjalankan command destruktif melalui ADB/Fastboot hanya karena perangkat terhubung.
- Jangan menawarkan jalur reset jika status otorisasi pemilik belum dikonfirmasi atau persetujuan kehilangan data belum dicatat. Jika kredensial Google/Xiaomi tidak diketahui, jeda dan arahkan ke pemulihan akun resmi sebelum reset.
- Penambahan eksekusi native per model di masa depan memerlukan proposal scope terpisah, documented allowlist, perangkat uji yang sah, konfirmasi eksplisit, dan test plan untuk setiap model/versi yang dinyatakan didukung.

### 7.7 Tools

- Pemeriksaan ketersediaan ADB/Fastboot.
- Pemeriksaan versi tools dan konektivitas dasar.
- Shortcut ke dokumentasi teknis resmi.

### 7.8 Drivers

- Status driver yang dapat dideteksi, status perangkat di Device Manager bila integrasi tersedia, serta instruksi pemasangan dari situs OEM resmi.
- Jangan menyertakan driver dari mirror tak dikenal atau menjalankan installer driver tanpa persetujuan pengguna.

### 7.9 Logs

- Waktu lokal, kategori, tingkat severity, ringkasan, serta detail teknis yang telah disanitasi.
- Tombol Clear Logs harus meminta konfirmasi bila menghapus seluruh riwayat tersimpan.
- Ekspor diagnosis tidak boleh menyertakan kredensial atau konten pribadi.

### 7.10 Settings

- Tema (default dark), lokasi Android Platform-Tools, lokasi data/log, bahasa, opsi privasi, pengaturan AI, dan pengaturan penyimpanan riwayat AI.
- Provider AI default: `Nonaktif`. Provider cloud tidak boleh aktif sampai pengguna mengonfigurasi dan menyetujui pengiriman data. Pilihan lokal hanya boleh ditampilkan sebagai tersedia jika benar-benar diimplementasikan dan lolos tes.
- Perubahan path harus divalidasi dan diuji sebelum disimpan.
- Pengaturan yang belum diimplementasikan tidak boleh tampil seolah-olah bekerja.

## 8. Perilaku Interaksi Penting

- **Auto Detect:** jalankan deteksi nyata dengan timeout dan tampilkan status `Mendeteksi…`, `Perangkat ditemukan`, `Tidak ada perangkat`, atau error yang bisa ditindaklanjuti.
- **Metode:** kartu aktif berubah border/warna; pilihan metode hanya memilih kategori diagnosis atau panduan yang relevan, tidak menjalankan exploit.
- **Brand:** hanya satu brand aktif. `Auto Detect` boleh mengisi brand ketika terdeteksi dengan keyakinan yang memadai; user tetap bisa mengubah filter tampilan.
- **Mulai Diagnosis:** tombol disabled ketika diagnosis tidak tersedia atau proses berjalan; saat aktif, tampilkan progress dan log secara bertahap.
- **Cancel:** proses yang berjalan dapat dibatalkan dengan rapi, lalu log akhir menunjukkan pembatalan.
- **Clear Log:** log tampilan langsung diperbarui setelah penghapusan berhasil; tampilkan pesan error jika gagal.
- **No device:** gunakan empty state; jangan menunjukkan `Device Ready` atau `USB Connected` palsu.
- **Demo mode:** data contoh seperti Samsung Galaxy A12 hanya boleh muncul jika badge `DEMO` terlihat jelas dan tidak ada perangkat riil yang tersambung.
- **Recovery routing:** keputusan mengikuti pilihan pelanggan per tiket. Jika pelanggan eksplisit menyetujui penghapusan data, rekomendasikan Guided Factory Reset resmi setelah preflight dan cek kesiapan akun pasca-reset. Jika data harus dipertahankan atau pilihan belum jelas, gunakan Data Preservation. Jangan pernah menyimpulkan consent dari kebiasaan pelanggan lain.
- **AI:** sebelum pengiriman cloud, tampilkan preview jenis informasi yang akan dibagikan, jelaskan tujuan dan minta consent terpisah. AI/provider error tidak boleh memblokir fitur utama.

## 9. Persyaratan Dropdown dan Kontrol Pilihan

- **DILARANG** menggunakan popup `<select>` native browser untuk kontrol pilihan yang terlihat oleh pengguna. Gunakan komponen custom yang distyling sesuai `DESIGN.md` (disarankan Radix UI Select; combobox menggunakan primitive aksesibel yang setara).
- Berlaku untuk seluruh dropdown di semua halaman, termasuk pilihan bahasa, tema, provider/model AI, mode diagnosis, filter log, opsi koneksi, dan pengaturan lain.
- Tampilan harus memiliki trigger kustom, chevron konsisten, panel popup custom, selected item yang jelas, hover, focus-visible, disabled, error, loading, dan empty states bila relevan.
- Mendukung keyboard: Enter/Space membuka, Arrow Up/Down memilih, Escape menutup dan mengembalikan fokus, typeahead bila relevan, serta label dan status ARIA yang benar.
- Popup harus memiliki positioning/portal agar tidak terpotong panel atau window, batas tinggi dengan scroll internal, dan z-index yang teratur. Klik di luar menutup popover tanpa mengganggu fokus.
- Field pencarian harus memakai custom combobox dengan empty state dan tombol clear yang terdesain; jangan gunakan `<datalist>`.
- Native OS file chooser boleh digunakan untuk memilih file/path karena itu dialog pemilih file sistem, bukan dropdown pilihan aplikasi.
- Uji setiap dropdown di keyboard-only, resize window, kondisi disabled, daftar panjang, dan screenshot regression.

## 10. AI Assistant: Kontrak Produk dan Keamanan

### Kemampuan yang boleh diberikan

- Menjelaskan arti status koneksi dan pesan error dalam log yang telah disanitasi.
- Meminta klarifikasi terbatas tentang kondisi perangkat, lalu menyusun langkah diagnosis non-destruktif.
- Menyusun checklist untuk mencari backup Google/Xiaomi dari perangkat lain dan memberi tautan bantuan resmi.
- Menjelaskan perbedaan lupa PIN/pola layar, App Lock/Privacy Lock, lupa akun Google, FRP setelah reset, serta masalah driver/ADB/Fastboot.
- Membantu teknisi memilih jalur per tiket: Guided Factory Reset resmi jika pelanggan eksplisit menyetujui kehilangan data dan preflight terpenuhi; Data Preservation jika data harus dipertahankan atau keputusan belum jelas.
- Membuat ringkasan diagnosis dan laporan yang menandai mana fakta, input pengguna, dan inferensi.

### Yang tidak boleh dijanjikan/dilakukan

- Jangan menjanjikan membuka PIN/pola tanpa kredensial, memulihkan data terenkripsi, atau bypass FRP otomatis. Jangan menyatakan perangkat akan tetap menyimpan data apabila prosedur yang dipilih menghapusnya.
- Jangan memberikan exploit atau langkah untuk menonaktifkan perlindungan anti-pencurian.
- Jangan meminta, menyimpan, atau mengirim PIN, pola, kata sandi, OTP, recovery code, cookie, atau token akun.
- Jangan mengeksekusi perintah hasil generasi model dan jangan membiarkan model memberikan string command shell untuk diteruskan secara otomatis.
- Jangan mengatakan proses perangkat berhasil kecuali service diagnostik melaporkan hasil yang benar-benar terverifikasi.

### Arsitektur dan provider

- Definisikan kontrak provider (`AiProvider`) agar komponen UI tidak terikat ke vendor tertentu.
- Fungsi diagnosis lokal tetap bekerja walau AI dimatikan, offline, mencapai rate limit, atau gagal.
- Jangan mengunci implementasi ke model Claude hanya karena Claude digunakan untuk coding. Pemakaian Claude API di dalam produk adalah integrasi terpisah yang membutuhkan konfigurasi, kebijakan privasi, dan kemungkinan biaya API tersendiri.
- API key tidak boleh dibundel ke aplikasi. Untuk penggunaan key milik pengguna, gunakan penyimpanan kredensial OS yang sesuai dan jangan tulis key ke log/config plaintext. Untuk produk multi-user dengan key bersama, gunakan backend tepercaya; jangan menanamkan secret server di aplikasi desktop.
- Request ke cloud hanya setelah consent. Tampilkan provider, tujuan, kategori data yang dibagikan, dan cara menonaktifkan AI.
- Simpan chat history dalam keadaan nonaktif secara default; jika pengguna mengaktifkan penyimpanan, simpan secara lokal, sediakan hapus percakapan dan clear history.
- Batas output, timeout, rate limit, penanganan markdown/link, dan penanganan prompt injection diperlukan. Treat log perangkat, teks pengguna, dan konten yang diambil dari internet sebagai data tak tepercaya, bukan instruksi sistem.
- AI menghasilkan rekomendasi saja. Backend tetap menjadi sumber kebenaran untuk status device dan hasil proses.

### MVP dan fallback

- MVP: explain diagnostic logs, triase Screen Lock Recovery berbasis preferensi pelanggan, guided factory-reset berbasis dokumentasi resmi dengan preflight/consent, checklist penyelamatan data untuk pelanggan yang memilihnya, official-link suggestions, dan summary generation dengan provider yang dapat dikonfigurasi.
- Jika provider belum dikonfigurasi, tampilkan AI Assistant dalam status `Belum dikonfigurasi` dengan penjelasan; jangan memalsukan jawaban AI dengan template statis yang seolah respons model.
- Mode AI lokal adalah opsi fase lanjutan; jangan memasarkannya sebagai offline sampai model, runtime, ukuran, dan hasil tes benar-benar tersedia.

## 11. Database Supabase dan Model Data Minimum (WAJIB)

### Keputusan database dan arsitektur

- **Supabase PostgreSQL adalah database utama wajib** untuk data persisten akun, preferensi tersinkron, riwayat diagnosis, snapshot perangkat yang diminimalkan, log sanitasi, dan riwayat AI yang pengguna aktifkan.
- Gunakan `@supabase/supabase-js` melalui satu data-access/repository layer, bukan query Supabase langsung tersebar di komponen UI. Device discovery, ADB/Fastboot, sanitasi output, dan pemeriksaan lokal tetap berada di Rust/service layer Tauri.
- Supabase Auth email/password disediakan untuk akses data cloud. Diagnosis lokal tetap dapat digunakan dalam mode tamu tanpa akun. Pengguna harus login untuk membaca/menulis data akun di Supabase. Implementasikan sign-up/sign-in/sign-out, status sesi, pemulihan kata sandi/verifikasi email melalui redirect/deep-link yang dikonfigurasi dengan aman, dan error states.
- Gunakan **publishable key** pada konfigurasi client. Publishable key dan project URL bukan secret; karena desktop binary dapat diperiksa, keamanan data wajib berasal dari Auth, grants minimum, dan RLS. **Jangan pernah menanamkan `service_role`/secret key, password database, atau connection string privileged dalam frontend, Rust binary, `.env` yang dibundel, installer, repository, atau log.** Operasi administratif harus dilakukan melalui Supabase Dashboard/CLI atau backend tepercaya jika suatu kebutuhan server-side kelak disetujui.
- Setiap tabel pada schema yang terekspos wajib memiliki RLS aktif dan policy eksplisit. Tulis/test policy SELECT/INSERT/UPDATE/DELETE sesuai kebutuhan. Semua row milik pengguna harus dibatasi ke `auth.uid()`; jangan percaya `user_id` dari UI tanpa policy database yang mengeceknya. Beri grants minimum dan indeks untuk kolom filter/policy.
- Schema dan policy dikelola sebagai migration SQL berversi di `supabase/migrations/`, bukan hanya dibuat manual di Dashboard. Sertakan langkah `supabase db push`/migration dan tes RLS dalam dokumentasi proyek.
- Supabase memerlukan internet untuk sign-in, akses cloud history, serta penyimpanan cloud. Diagnosis USB/ADB/Fastboot harus tetap bisa berjalan offline. Dalam kondisi offline, tampilkan status `Belum tersimpan ke cloud`; sediakan ekspor laporan lokal yang telah disanitasi. Jangan menampilkan riwayat cloud seolah-olah telah tersimpan, dan jangan membuat sinkronisasi lokal tertunda tanpa rancangan/tes yang disetujui.
- Tidak wajib memakai SQLite pada MVP. Jangan diam-diam mengganti Supabase dengan SQLite, localStorage, file JSON, atau React state sebagai database utama. `localStorage`/Tauri Store hanya boleh dipertimbangkan untuk preferensi UI non-sensitif atau kebutuhan sesi yang memang dirancang, bukan sebagai pengganti database cloud.
- Data diagnosis tidak boleh diunggah otomatis tanpa penjelasan dan persetujuan pengguna. Buat pilihan jelas seperti `Simpan riwayat ke Supabase`; tampilkan jenis data yang disimpan. Minimalkan informasi perangkat dan hapus serial/IMEI, path lokal, username Windows, serta nilai sensitif dari log secara default.

### Skema cloud minimum

1. `profiles`: satu row per pengguna Supabase Auth (`id` sama dengan `auth.users.id`), email/display name yang diperlukan, timestamp. Tidak menyimpan password.
2. `app_settings`: satu row per pengguna dengan preferensi non-rahasia dalam `jsonb`, misalnya tema, bahasa, filter default, provider/model AI yang dipilih, dan `ai_history_enabled` (default `false`). Tidak boleh menyimpan API key/token/password.
3. `device_snapshots`: informasi perangkat yang benar-benar terdeteksi dan diminimalkan: brand, model, model code bila tersedia, versi Android, transport, authorization state, waktu deteksi. Jangan menyimpan IMEI/serial/permanent identifier secara default; jangan simpan data `DEMO` sebagai perangkat nyata.
4. `recovery_cases`: tiket pemulihan tersanitasi berisi merek/model, tipe masalah, preferensi/prioritas data, status backup, kesiapan akun Google/Xiaomi pasca-reset, kondisi akses, konfirmasi otorisasi, jalur pemulihan, status/waktu/versi teks persetujuan reset, status kasus, dan ringkasan hasil. Jalur `guided_factory_reset` hanya boleh tersimpan sebagai jalur terpilih setelah consent reset diterima dan timestamp tersedia. Jangan menyediakan field untuk PIN/pola/password/OTP atau menyimpan IMEI/serial secara default.
5. `diagnostic_runs`: waktu mulai/selesai, kategori (termasuk `screen_lock_recovery` dan `factory_reset_guidance`), status, ringkasan, error code, progress akhir, dan snapshot opsional. Simpan hanya data yang telah disanitasi dan disetujui untuk cloud.
6. `diagnostic_logs`: log terkait diagnosis dengan timestamp, severity, pesan/detail yang sudah disanitasi dan batas ukuran output. Hapus bersama diagnosis induk.
7. `ai_conversations` dan `ai_messages`: simpan hanya jika pengguna secara eksplisit mengaktifkan riwayat AI/cloud history. Default OFF. Sediakan delete per percakapan dan clear history; jangan simpan system prompts, secret, PIN, password, OTP, token, atau kredensial.
Setiap tabel milik pengguna wajib memiliki `user_id uuid references auth.users(id) on delete cascade` (kecuali `profiles.id` yang juga mereferensikan `auth.users`). Untuk tabel anak, gunakan constraint yang memastikan parent dan child dimiliki user yang sama; RLS tetap wajib. Tambahkan created/updated timestamps, batas panjang field, CHECK constraint untuk status/role, indeks `user_id` dan waktu, serta `ON DELETE CASCADE` untuk child logs/messages bila sesuai.

### RLS, Auth, dan akses cloud

- Semua tabel yang diakses client harus `ENABLE ROW LEVEL SECURITY`. `anon` tidak mendapat akses ke tabel privat. Berikan grants hanya pada operasi yang dibutuhkan bagi role `authenticated`; tabel/prosedur sensitif tidak boleh mengandalkan obscurity atau UUID yang sulit ditebak.
- Policy setiap operasi harus memverifikasi `user_id = (select auth.uid())`; `profiles` memeriksa `id = (select auth.uid())`. Pastikan policy INSERT memakai `WITH CHECK`, dan UPDATE memakai `USING` sekaligus `WITH CHECK`.
- Buat tes RLS yang membuat minimal dua user uji: user A tidak boleh SELECT/UPDATE/DELETE row user B, tidak bisa membuat row atas nama B, dan tidak bisa menghubungkan child record ke parent milik B. Uji signed-out client juga tidak boleh mengakses data privat.
- Gunakan Supabase Auth; jangan membuat autentikasi kustom yang hanya menyimpan `user_id` di UI. Simpan sesi/refresh token dengan mekanisme penyimpanan yang sesuai untuk aplikasi desktop (misalnya OS credential store/Tauri Stronghold melalui adapter yang diuji); jangan menulis token ke log atau config plaintext. Jangan menyatakan integrasi penyimpanan sesi aman sebelum benar-benar diuji.
- Semua redirect verifikasi email/reset password harus menggunakan callback URI yang terdaftar secara eksplisit di Supabase dan ditangani oleh deep-link handler aplikasi yang divalidasi. Tolak callback/URL eksternal yang tidak diizinkan.
- `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` dapat berada di `.env.local` karena publishable key memang publik, tetapi jangan menganggapnya rahasia. Tambahkan `.env.example` placeholder dan pastikan `.env.local` masuk `.gitignore`. Tidak boleh ada `SUPABASE_SERVICE_ROLE_KEY` dalam konfigurasi client.

### Kriteria operasi database dan acceptance

- Tambahkan migration SQL awal untuk tabel, foreign keys, checks, indexes, triggers yang diperlukan, grants, dan RLS policies.
- Buat layer repositories/types terpusat untuk profil, settings, snapshot, recovery cases, diagnosis, logs, dan optional AI history. Validasi input di frontend dan tetap gunakan constraints/RLS sebagai enforcement database.
- Setelah pengguna memilih `Simpan ke cloud`, simpan diagnosis dan logs yang tersanitasi dalam transaction atau RPC yang sesuai agar record parent/child tidak setengah tersimpan. Jika multi-step client request digunakan tanpa transaksi, desain rollback/error state yang dapat diuji; jangan klaim atomik jika tidak.
- UI harus mendukung daftar/lihat detail/hapus tiket pemulihan dan diagnosis, pencatatan persetujuan reset, clear history dengan konfirmasi, ekspor lokal, dan retry saat cloud request gagal. Penghapusan harus terjadi di Supabase dan cascade ke log/message yang relevan.
- Tampilkan status `Cloud tersambung`, `Perlu login`, `Offline`, `Menyimpan`, `Tersimpan`, atau `Gagal menyimpan` berdasarkan hasil operasi nyata.
- Uji migration, schema constraints, CRUD, RLS dengan dua user, signed-out access denial, ownership parent-child, delete cascade, invalid session/expired session, network timeout/offline, rate limit, clear/export, dan redaksi data. Jangan menyatakan database selesai sebelum migration dan tes benar-benar dijalankan.

### Entitas domain frontend

Gunakan tipe TypeScript terpisah dari bentuk row database dan pemetaan eksplisit:

- `DeviceSnapshot`: `id`, `brand`, `model`, `modelCode?`, `androidVersion?`, `securityPatch?`, `transport`, `authorization`, `detectedAt`, `source: live | demo` (`demo` tidak boleh disimpan sebagai data nyata).
- `DiagnosticRun`: `id`, `startedAt`, `finishedAt?`, `deviceSnapshotId?`, `category`, `status`, `progressPercent`, `summary?`, `errorCode?`.
- `DiagnosticLog`: `id`, `runId`, `timestamp`, `level`, `message`, `detailsRedacted?`.

Nama kolom SQL dapat mengikuti snake_case, sedangkan tipe domain frontend dapat camelCase. Jangan mengirim object perangkat mentah ke Supabase; gunakan allowlist field dari DTO yang telah disanitasi.


## 12. Persyaratan Nonfungsional

- Startup ke dashboard lokal tanpa menunggu jaringan.
- Tidak ada request jaringan yang diperlukan untuk deteksi dasar.
- UI tidak freeze saat proses ADB/Fastboot berjalan; pekerjaan eksternal dilakukan asynchronous dari UI.
- Setiap proses eksternal memiliki timeout dan batas output.
- Aplikasi tetap dapat dibuka tanpa ADB terpasang; UI menjelaskan cara memasangnya.
- Error ditampilkan dengan bahasa manusia, disertai detail teknis opsional untuk teknisi.
- Simpan data persisten aplikasi melalui Supabase dengan Auth + RLS; minimalkan data perangkat, jangan simpan kredensial, dan sediakan penghapusan cloud/export yang disanitasi.
- Saat AI nonaktif/provider gagal, diagnosis dasar tetap berfungsi tanpa jaringan.
- Konten AI yang menampilkan link atau markdown harus disanitasi; jangan render HTML mentah dari model.
- Tidak mengklaim kompatibilitas merek/model sebelum diuji.

## 13. Strategi Pengujian

### Otomatis

- Unit tests: state device, parser output ADB, validasi data, redaksi log, dan error mapping.
- Component tests: sidebar, kartu metode, pilihan brand, panel device info, progress, tombol clear log, empty state, demo mode, custom dropdown/combobox, consent AI, dan keadaan provider AI.
- E2E: navigasi halaman, resize window layout, interaksi kartu, kondisi no-device, error ADB, progress/cancel, clear logs, settings validation, semua dropdown kustom, serta AI-disabled/provider-error/cloud-consent flows.
- Typecheck dan lint harus lulus.

### Manual dengan perangkat nyata

- Tidak ada perangkat tersambung.
- Perangkat dengan USB debugging mati.
- ADB unauthorized.
- ADB authorized.
- Fastboot device terdeteksi dan tidak terdeteksi.
- Kabel/port terputus di tengah diagnosis.
- Tools tidak terpasang atau path salah.
- Perangkat dari tiap brand yang diumumkan mendukung.

Jangan membuat klaim dukungan lintas-merek dari satu perangkat uji saja.

## 14. Kriteria Penerimaan / Definition of Done

- [ ] Saat window berukuran 1536×1024, layout dan proporsi mengikuti `reference-ui.png` sedekat mungkin.
- [ ] Header, sidebar, hero, area metode/brand, panel kanan, dan status sidebar berada di lokasi yang ditentukan `DESIGN.md`.
- [ ] Warna, font, spacing, border, radius, ikon, dan hierarchy konsisten dengan `DESIGN.md`.
- [ ] Seluruh komponen menggunakan data nyata atau explicit demo state; tidak ada status palsu.
- [ ] Navigasi, selection state, Auto Detect, progress, log, clear log, settings, Screen Lock Recovery, AI Assistant, dan help berfungsi.
- [ ] Screen Lock Recovery meminta pilihan data dari pelanggan per kasus; tidak ada consent yang diasumsikan.
- [ ] Jika pelanggan eksplisit menyetujui penghapusan data, Guided Factory Reset resmi menjadi jalur yang disarankan setelah preflight, kesiapan akun Google/Xiaomi, dan consent tercatat.
- [ ] Jika pelanggan meminta data dipertahankan atau belum memutuskan, aplikasi menggunakan jalur Data Preservation dan tidak menawarkan reset sebagai aksi utama tanpa consent baru.
- [ ] Aplikasi tidak menetapkan PIN/pola dari desktop ke layar yang masih terkunci; PIN/pola baru dibuat pemilik di perangkat setelah setup/akses sah.
- [ ] Tiket pemulihan dan persetujuan reset yang disanitasi dapat disimpan dan dihapus di Supabase.
- [ ] Semua dropdown visual merupakan custom dropdown aksesibel; tidak ada popup native browser yang terlihat.
- [ ] AI tidak mengirim konteks sensitif tanpa persetujuan dan tidak mengeksekusi perintah perangkat.
- [ ] AI unavailable/offline tidak merusak fungsi diagnosis inti.
- [ ] Tidak ada tindakan destruktif yang dieksekusi otomatis; Guided Factory Reset memberi panduan resmi setelah preflight dan persetujuan eksplisit pemilik.
- [ ] Tidak ada arbitrary shell execution atau command untuk menonaktifkan FRP.
- [ ] Supabase migration membuat tabel, grants, constraints, indeks, dan RLS policies yang diuji.
- [ ] Supabase Auth membatasi akses cloud dan semua tabel privat menerapkan RLS; pengujian membuktikan isolasi antar-user.
- [ ] Riwayat, penghapusan, clear history, dan ekspor bekerja pada data nyata, bukan sekadar state UI.
- [ ] Cloud status/offline/error ditampilkan akurat; diagnosis lokal tetap bisa dipakai tanpa internet.
- [ ] Data cloud diminimalkan; tidak ada credential atau identifier permanen tersimpan secara default.
- [ ] Tidak ada data sensitif yang disimpan/diekspor tanpa kebutuhan dan pemberitahuan.
- [ ] Unit/component tests, lint, dan typecheck lulus.
- [ ] E2E test utama lulus; keterbatasan tes hardware didokumentasikan.
- [ ] Installer Windows diuji pada instalasi bersih.
- [ ] README berisi langkah instalasi development, build, troubleshooting ADB, dan batas fitur yang belum tersedia.
- [ ] Tidak boleh menyatakan “selesai” sebelum bukti test dan build benar-benar tersedia.

## 15. Tahap Pengiriman

1. **Milestone 1 — Visual shell:** layout statis dengan data demo yang ditandai, semua halaman dan responsive window behaviour.
2. **Milestone 2 — Live diagnostics:** deteksi ADB/Fastboot, device snapshot, status, progress, log, dan error path.
3. **Milestone 3 — Screen Lock Recovery:** intake kasus dengan pilihan data pelanggan, Guided Factory Reset untuk tiket yang memiliki consent eksplisit, kesiapan akun pasca-reset, jalur Data Preservation untuk pelanggan yang memerlukannya, panduan OEM, dan hasil pasca-reset.
4. **Milestone 4 — Supabase foundation (wajib):** project config, Auth flow, schema migrations termasuk `recovery_cases`, grants/RLS, data-access layer, profile/settings, cloud status, ownership/RLS tests.
5. **Milestone 5 — Cloud diagnosis/case history:** save sanitized cases/snapshots/runs/logs only after user action/consent, history CRUD, consent tracking, delete cascade, offline/error/export flows.
6. **Milestone 6 — AI Assistant:** provider adapter, consent, log redaction, optional Supabase AI history (default OFF), safe two-path triage, error/fallback flows.
7. **Milestone 7 — Quality and release:** test suite, security review, hardware matrix, Windows installer.

Jangan mulai milestone berikutnya dengan mengorbankan kesetiaan visual atau membuat mock data tampak seperti data perangkat nyata.

## 16. Referensi Teknis

Gunakan dokumentasi resmi sebagai sumber saat implementasi:

- Tauri capabilities/security: <https://tauri.app/security/capabilities/>
- Tauri window customization: <https://v2.tauri.app/learn/window-customization/>
- React + TypeScript: <https://react.dev/learn/typescript>
- Android SDK Platform-Tools: <https://developer.android.com/tools/releases/platform-tools>
- Tailwind CSS: <https://tailwindcss.com/docs>
- Radix UI Select: <https://www.radix-ui.com/primitives/docs/components/select>
- Claude Code / CLAUDE.md project context: <https://support.claude.com/en/articles/14553240-give-claude-context-claude-md-and-better-prompts>
- Anthropic API key security (jika provider Claude API dipilih): <https://support.claude.com/en/articles/9767949-api-key-best-practices-keep-your-keys-safe-and-secure>
- Supabase security/RLS: <https://supabase.com/docs/guides/database/secure-data>
- Supabase RLS: <https://supabase.com/docs/guides/database/postgres/row-level-security>
- Supabase API keys: <https://supabase.com/docs/guides/getting-started/api-keys>
- Supabase Auth password/redirects: <https://supabase.com/docs/guides/auth/passwords> / <https://supabase.com/docs/guides/auth/redirect-urls>


## 17. Rujukan Resmi untuk Pemulihan

Gunakan dokumentasi produsen/Android sebagai sumber panduan dan verifikasi ulang tautan saat implementasi. Jangan mengarang URL atau memperlakukan blog pihak ketiga sebagai kebijakan resmi.

- Google Android — Tidak dapat membuka kunci perangkat: https://support.google.com/android/answer/7663172?hl=id
- Xiaomi — Phone Unlocking Q&As (termasuk peringatan Wipe Data dan akun Xiaomi pasca-reset): https://www.mi.com/global/support/faq/details/KA-07085/
- Xiaomi — The unlock screen password is forgotten: https://www.mi.com/global/support/faq/details/KA-492633/
- Pemulihan Akun Xiaomi: https://account.xiaomi.com/
- Pemulihan Akun Google: https://accounts.google.com/signin/recovery

Panduan resmi menunjukkan bahwa prosedur reset dapat menghapus data dan dapat meminta akun yang pernah terikat saat setup. Screen Lock Recovery harus menyampaikan batasan ini, bukan menjanjikan bahwa reset selalu menyelesaikan aktivasi perangkat.
