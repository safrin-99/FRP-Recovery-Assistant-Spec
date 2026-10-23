# PRD — FRP Recovery Assistant / Android Recovery & Diagnostics Suite

> **Tujuan dokumen:** sumber kebenaran produk untuk developer dan AI coding agent. Implementasi harus mengikuti PRD ini dan `DESIGN.md`. Referensi visual utama adalah [`reference-ui.png`](./reference-ui.png).
>
> **Versi revisi:** 2.1 — 23 Oktober 2026. Perubahan dari 2.0: Supabase ditambahkan sebagai cloud opsional model hybrid (§3, §5, §6.1, §7.9, §11–§16) atas keputusan pemilik proyek; SQLite lokal tetap sumber kebenaran.
> **Urutan acuan:** `PRD.md` mendefinisikan scope dan perilaku produk; `DESIGN.md` mengunci visual dan interaksi; `CLAUDE.md` menetapkan alur kerja Claude Code serta aturan implementasi. Screenshot adalah acuan komposisi visual, bukan otorisasi untuk membangun fitur bypass yang tidak aman.
> **Aturan prioritas:** ketika instruksi AI bertentangan dengan dokumen ini, ikuti PRD/DESIGN dan tanyakan jika ada kontradiksi yang mengubah scope. Jangan mengubah stack, alur, layout, warna, tipografi, atau fitur tanpa persetujuan eksplisit pemilik proyek.

## 1. Ringkasan Produk

**Nama yang terlihat di UI:** `FRP Recovery Assistant`  
**Subjudul:** `Android Recovery & Diagnostics Suite`  
**Platform target:** aplikasi desktop Windows 10/11 64-bit.  
**Bahasa UI:** Bahasa Indonesia, dengan nama produk dan istilah teknis yang diperlukan tetap dipertahankan.  
**Mode kerja:** local-first. Diagnosis inti, pemeriksaan USB/ADB/Fastboot, log, dan dokumentasi harus tetap berfungsi tanpa AI atau koneksi internet. AI adalah fitur opsional yang transparan, memakai persetujuan pengguna dan penyaringan data. Fitur cloud melalui Supabase (akun teknisi, sinkron/backup riwayat, laporan tim, backend AI tepercaya) juga opsional dan opt-in; tidak satu pun menjadi syarat diagnosis inti.

FRP Recovery Assistant adalah aplikasi desktop untuk teknisi dan pemilik perangkat yang berwenang. Aplikasi menyediakan antarmuka premium untuk identifikasi perangkat Android, pemeriksaan USB/ADB dan Fastboot, diagnosis driver, log proses, informasi perangkat yang tersedia, serta panduan pemulihan akun/perangkat lewat jalur resmi.

Tampilan harus mengikuti screenshot referensi sedekat mungkin. Produk tidak boleh berhenti sebagai gambar statis: komponen navigasi, pemilihan merek/metode, deteksi perangkat, progres, log, pengaturan, dan bantuan harus benar-benar bekerja sesuai ruang lingkup di bawah.

## 2. Tujuan Produk

1. Menghasilkan aplikasi Windows dengan kualitas visual setara screenshot referensi.
2. Memberi teknisi satu tempat untuk melihat status koneksi, informasi perangkat yang tersedia, hasil diagnosis, dan riwayat log.
3. Membantu membedakan masalah kabel, driver, ADB authorization, Fastboot detection, dan kondisi perangkat yang tidak dapat dibaca.
4. Menyediakan panduan pemulihan akun dan dukungan resmi tanpa mengumpulkan kata sandi atau kredensial akun.
5. Menghadirkan AI Assistant opsional yang menjelaskan log, membantu triase, dan menyusun langkah aman berdasarkan data yang benar-benar tersedia.
6. Menggunakan dropdown/combobox visual yang konsisten, bukan popup native browser yang tidak selaras dengan desain.
7. Menjadi dasar kode yang modular, teruji, mudah dirawat, serta mudah diteruskan melalui Claude Code berdasarkan `CLAUDE.md`.

## 3. Batas Ruang Lingkup dan Keamanan

### Termasuk

- Deteksi perangkat Android yang terlihat melalui alat resmi Android SDK Platform-Tools.
- Pembacaan informasi non-sensitif yang memang tersedia pada koneksi yang sah.
- Diagnosis status USB, ADB, dan Fastboot; bantuan pemeriksaan driver; dan instruksi troubleshooting.
- Riwayat diagnosis lokal, log bertimestamp, ekspor laporan diagnosis, dan pengaturan aplikasi.
- Panduan pemulihan akun Google/perangkat resmi sesuai dukungan produsen.
- Mode demo untuk preview UI ketika perangkat belum tersambung.
- Mode `Data Preservation` untuk memprioritaskan penyelamatan data dan menghindari operasi destruktif.
- AI Assistant opsional untuk menjelaskan hasil diagnosis/log yang telah disanitasi, memandu triase aman, dan merujuk dokumentasi resmi.
- Pengaturan provider AI yang transparan; fungsi inti tetap tersedia tanpa provider AI.
- Fitur cloud opsional melalui Supabase (lihat §6.1): akun teknisi, sinkron/backup riwayat diagnosis yang telah disanitasi, laporan bersama tim, dan backend AI tepercaya (Edge Functions). Semua nonaktif secara default dan membutuhkan login serta persetujuan pengguna.

### Tidak termasuk

- Eksploitasi kerentanan atau instruksi untuk menonaktifkan/melewati Factory Reset Protection (FRP) tanpa otorisasi.
- Pengambilan, penyimpanan, atau pengiriman kata sandi, token, cookie, atau kredensial akun Google.
- Menyamar sebagai layanan resmi Google atau produsen perangkat.
- Menjalankan perintah shell bebas yang diketik dari UI, payload arbitrer, atau skrip yang diunduh dari sumber tak tepercaya.
- Operasi test-point, exploit, patched firmware, atau pengubahan sistem untuk menghindari perlindungan anti-pencurian.
- AI yang menjalankan perintah perangkat atau shell secara otonom, mengubah sistem, membuka PIN, menghapus data, atau melewati FRP. AI hanya memberi saran dan penjelasan.
- Mengirim log atau informasi perangkat ke layanan AI/cloud secara diam-diam.
- Menaruh API key atau secret provider pada frontend, repository, berkas konfigurasi publik, atau installer — termasuk Supabase `service_role`/secret key.
- Menyimpan serial perangkat, IMEI, log mentah, path pengguna, atau data pribadi pemilik perangkat di Supabase.
- Menjadikan Supabase/internet sebagai syarat untuk membuka aplikasi, mendeteksi perangkat, atau menyimpan riwayat lokal.
- Melakukan factory reset, unlock bootloader, flashing, atau penghapusan data pada MVP. Operasi destruktif tidak menjadi bagian MVP.

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
- **Penyimpanan lokal:** SQLite melalui Rust (`rusqlite`) atau adapter setara yang diputuskan sejak tahap implementasi. SQLite adalah sumber kebenaran data aplikasi dan wajib bekerja offline.
- **Cloud opsional:** Supabase (Postgres + Auth + Row Level Security + Edge Functions) pada project khusus aplikasi ini, model hybrid: data tersanitasi disinkron setelah login dan consent. Aplikasi tetap berfungsi penuh tanpa Supabase. Detail aturan di §6.1.
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
  ├── Recovery guide links
  ├── Logging / redaction
  ├── SQLite repository (data lokal, sumber kebenaran)
  ├── Optional cloud sync service (login + consent, data tersanitasi, antrean offline)
  └── Optional AI Assistant service
       ├── Consent + context sanitizer
       ├── Provider adapter / timeout / limits
       └── No autonomous device commands
        │
        ├── Android SDK Platform-Tools terverifikasi
        ├── Database lokal aplikasi (SQLite)
        ├── Supabase opsional: Auth, Postgres + RLS, Edge Functions
        └── AI provider opsional (lewat Edge Function tepercaya atau key milik pengguna; hanya setelah consent)
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

### 6.1 Supabase (cloud hybrid, opsional)

Keputusan pemilik proyek (23 Oktober 2026): Supabase dipakai sebagai lapisan cloud **opsional** di atas SQLite lokal.

**Fungsi yang disetujui**

1. **Akun teknisi** — Supabase Auth untuk login teknisi/staf servis. Tanpa login, seluruh fitur lokal tetap tersedia.
2. **Sinkron & backup riwayat** — ringkasan diagnosis yang telah disanitasi disalin ke Supabase setelah login dan consent; dapat dipulihkan di komputer lain milik akun yang sama.
3. **Laporan bersama tim** — laporan diagnosis tersanitasi dapat dibagikan ke anggota tim/servis yang sama.
4. **Backend AI tepercaya** — Supabase Edge Functions menyimpan API key provider AI sebagai secret server, sehingga key bersama tidak pernah ada di aplikasi desktop (memenuhi §10).

**Aturan**

- Gunakan project Supabase **khusus** aplikasi ini. Jangan memakai atau mengubah project lain di akun yang sama.
- SQLite tetap sumber kebenaran. Supabase offline, timeout, kuota habis, atau error autentikasi tidak boleh memblokir diagnosis, log, atau riwayat lokal; perubahan diantrekan dan disinkron ulang.
- Default: tidak login dan sinkron nonaktif. Sebelum sinkron pertama, tampilkan kategori data yang akan diunggah, tujuan, dan cara menonaktifkan/menghapus; minta consent terpisah.
- Aplikasi hanya membawa URL project dan publishable/anon key (aman karena dilindungi RLS). `service_role`/secret key hanya di Supabase secrets atau CI, tidak pernah di aplikasi, repository, installer, atau log.
- Row Level Security wajib aktif di setiap tabel sejak migrasi pertama. Kebijakan berbasis `auth.uid()` dan keanggotaan tim; data pengguna/tim lain tidak boleh terbaca.
- Data minimization: yang boleh disinkron hanya ringkasan tersanitasi (brand/model bila diketahui, jenis koneksi, status run, ringkasan, level/kategori log, pesan log yang telah diredaksi). Tidak boleh: serial, IMEI, path pengguna, log mentah, PIN/pola, kata sandi, OTP, token akun perangkat.
- Sesi Auth (access/refresh token) disimpan melalui penyimpanan kredensial OS, bukan localStorage polos.
- Skema dikelola melalui file migrasi di repository (`supabase/migrations`), bukan perubahan manual di dashboard. Migrasi destruktif memerlukan persetujuan pemilik proyek.
- Edge Function AI memverifikasi JWT pengguna, menerapkan rate limit dan batas ukuran input/output, tidak mencatat konten sensitif, dan tetap tunduk pada seluruh aturan AI di §10.
- Pengguna dapat keluar akun, menghentikan sinkron, dan menghapus seluruh data cloud miliknya dari aplikasi.
- `connect-src` pada CSP Tauri hanya ditambah domain project Supabase saat fitur ini diimplementasikan.

## 7. Peta Navigasi dan Halaman

Sidebar harus mengikuti urutan berikut:

1. Home
2. FRP Recovery
3. AI Assistant
4. Device Info
5. Flash / Factory Reset
6. Tools
7. Drivers
8. Logs
9. Settings

Header atas: logo perisai, nama aplikasi, subjudul, Settings, Logs, Help, dan kontrol jendela Windows.

### 7.1 Home

- Hero/banner atas dengan judul, subjudul, 3 benefit icon, dan ilustrasi dua ponsel.
- Panel pemilihan metode berisi 4 kartu.
- Panel pilihan merek Android.
- Tombol aksi utama.
- Panel kanan Informasi Perangkat.
- Panel kanan Progress dan log terbaru.
- Kartu status koneksi di bagian bawah sidebar.

### 7.2 FRP Recovery

- Menjelaskan keadaan verifikasi/perlindungan yang dapat diketahui secara sah.
- Menyediakan jalur bantuan pemulihan akun resmi dan dokumentasi produsen.
- Jika status FRP tidak dapat diinspeksi oleh alat yang tersedia, tampilkan `Tidak dapat diverifikasi melalui koneksi ini`, bukan menebak status.
- Tidak ada tombol atau skrip untuk mengeksploitasi maupun menonaktifkan FRP.

### 7.3 AI Assistant

- Halaman khusus percakapan AI yang membantu menjelaskan diagnosis, menginterpretasi log yang sudah disanitasi, dan memandu langkah pemulihan aman.
- AI Assistant bukan tool bypass dan tidak dapat membuka PIN/pola, mendekripsi data, atau menjamin pemulihan akses.
- Input awal dapat memuat konteks diagnosis saat ini, tetapi hanya data minimum dan setelah pengguna menyetujui pengiriman ke provider jika provider cloud digunakan.
- Tampilkan label sumber konteks: `Terdeteksi`, `Dari pengguna`, `Dugaan`, atau `Tidak diketahui`. Jangan menyatakan status FRP jika tidak bisa dibuktikan.
- Jawaban AI harus memisahkan `Temuan`, `Langkah aman berikutnya`, `Risiko`, dan `Sumber resmi` bila relevan.
- Berikan peringatan untuk tindakan yang mungkin menghapus data. AI tidak boleh menjalankan command atau operasi perangkat secara langsung.
- Jika AI/provider tidak tersedia, tampilkan error yang jelas dan tetap sediakan diagnosis/manual help.
- Riwayat percakapan disimpan lokal hanya sesuai pengaturan; pengguna dapat menghapusnya. Default simpan riwayat AI: nonaktif kecuali pengguna mengaktifkannya.

### 7.4 Device Info

- Brand, model, model code, versi Android, patch keamanan bila tersedia, jenis koneksi, dan status otorisasi ADB/Fastboot.
- Field yang belum diketahui harus menampilkan `—` / `Tidak tersedia`.
- Jangan mengisi informasi statis dari perangkat demo pada sesi perangkat nyata.

### 7.5 Flash / Factory Reset

- MVP berupa halaman informasi risiko, persyaratan, dan tautan ke petunjuk resmi.
- Tidak melakukan flash, unlock, reset, atau tindakan destruktif pada MVP.
- Jika fungsi resmi yang destruktif ditambahkan di masa depan, wajib ada proposal terpisah, validasi kompatibilitas, peringatan kehilangan data, konfirmasi eksplisit, serta test plan untuk setiap perangkat yang dinyatakan didukung.

### 7.6 Tools

- Pemeriksaan ketersediaan ADB/Fastboot.
- Pemeriksaan versi tools dan konektivitas dasar.
- Shortcut ke dokumentasi teknis resmi.

### 7.7 Drivers

- Status driver yang dapat dideteksi, status perangkat di Device Manager bila integrasi tersedia, serta instruksi pemasangan dari situs OEM resmi.
- Jangan menyertakan driver dari mirror tak dikenal atau menjalankan installer driver tanpa persetujuan pengguna.

### 7.8 Logs

- Waktu lokal, kategori, tingkat severity, ringkasan, serta detail teknis yang telah disanitasi.
- Tombol Clear Logs harus meminta konfirmasi bila menghapus seluruh riwayat tersimpan.
- Ekspor diagnosis tidak boleh menyertakan kredensial atau konten pribadi.

### 7.9 Settings

- Tema (default dark; tema terang opsional sesuai DESIGN.md §3.1, disimpan per komputer), lokasi Android Platform-Tools, lokasi data/log, bahasa, opsi privasi, pengaturan AI, dan pengaturan penyimpanan riwayat AI.
- Akun & Sinkronisasi (Supabase, §6.1): login teknisi, status sinkron terakhir, tim, consent sinkron, hentikan sinkron, dan hapus data cloud. Default: tidak login dan sinkron nonaktif.
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
- **Data Preservation Mode:** jika pengguna menyatakan data penting/tidak ada backup dan layar terkunci, tampilkan prioritas penyelamatan data, hindari reset/flash, dan arahkan pemeriksaan backup serta layanan resmi. Jangan menawarkan tombol satu-klik yang destruktif.
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
- Menjelaskan perbedaan lupa PIN/pola, lupa akun Google, FRP setelah reset, serta masalah driver/ADB/Fastboot.
- Membuat ringkasan diagnosis dan laporan yang menandai mana fakta, input pengguna, dan inferensi.

### Yang tidak boleh dijanjikan/dilakukan

- Jangan menjanjikan membuka PIN/pola tanpa kredensial, memulihkan data terenkripsi, atau bypass FRP otomatis.
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

- MVP: explain diagnostic logs, safe guided triage, official-link suggestions, dan summary generation dengan provider yang dapat dikonfigurasi.
- Jika provider belum dikonfigurasi, tampilkan AI Assistant dalam status `Belum dikonfigurasi` dengan penjelasan; jangan memalsukan jawaban AI dengan template statis yang seolah respons model.
- Mode AI lokal adalah opsi fase lanjutan; jangan memasarkannya sebagai offline sampai model, runtime, ukuran, dan hasil tes benar-benar tersedia.

## 11. Model Data Minimum

### DeviceSnapshot

- `id` (ID sesi internal; bukan serial mentah jika tidak diperlukan)
- `brand`, `model`, `modelCode`
- `androidVersion`, `securityPatch` (nullable)
- `transport`: `usb | adb | fastboot | unknown`
- `authorization`: `authorized | unauthorized | offline | unavailable | unknown`
- `detectedAt`
- `source`: `live | demo`

### DiagnosticRun

- `id`, `startedAt`, `finishedAt`
- `deviceSnapshotId` (nullable)
- `category`, `status`, `progressPercent`
- `summary`, `errorCode` (nullable)

### DiagnosticLog

- `id`, `runId`, `timestamp`, `level`, `message`, `detailsRedacted`

### Data cloud (Supabase, opsional)

Skema final ditetapkan pada Milestone 3; batas minimum:

- `profiles` — `id` (= `auth.uid()`), `displayName`, `createdAt`.
- `teams`, `team_members` — keanggotaan tim untuk laporan bersama; peran minimum `owner | member`.
- `diagnostic_runs` (cloud) — salinan tersanitasi dari `DiagnosticRun` + `ownerId`, `teamId` (nullable), `localId`, `syncedAt`.
- `diagnostic_logs` (cloud) — hanya `level`, kategori, `timestamp`, dan pesan yang telah diredaksi; tidak ada `detailsRedacted` mentah kecuali lolos redaksi.
- `shared_reports` — laporan yang sengaja dibagikan ke tim.

Semua tabel cloud memakai RLS. ID sesi lokal tidak boleh berupa serial perangkat.

Seluruh nilai dari perangkat dianggap tidak tepercaya. Validasi panjang dan karakter teks sebelum ditampilkan atau diekspor.

## 12. Persyaratan Nonfungsional

- Startup ke dashboard lokal tanpa menunggu jaringan.
- Tidak ada request jaringan yang diperlukan untuk deteksi dasar.
- UI tidak freeze saat proses ADB/Fastboot berjalan; pekerjaan eksternal dilakukan asynchronous dari UI.
- Setiap proses eksternal memiliki timeout dan batas output.
- Aplikasi tetap dapat dibuka tanpa ADB terpasang; UI menjelaskan cara memasangnya.
- Error ditampilkan dengan bahasa manusia, disertai detail teknis opsional untuk teknisi.
- Simpan minimum data yang diperlukan dan hindari pencatatan kredensial.
- Saat AI nonaktif/provider gagal, diagnosis dasar tetap berfungsi tanpa jaringan.
- Saat Supabase tidak dapat dijangkau atau pengguna tidak login, aplikasi tetap dapat dibuka, mendiagnosis, dan menyimpan riwayat lokal; sinkron diantrekan.
- Konten AI yang menampilkan link atau markdown harus disanitasi; jangan render HTML mentah dari model.
- Tidak mengklaim kompatibilitas merek/model sebelum diuji.

## 13. Strategi Pengujian

### Otomatis

- Unit tests: state device, parser output ADB, validasi data, redaksi log, dan error mapping.
- Component tests: sidebar, kartu metode, pilihan brand, panel device info, progress, tombol clear log, empty state, demo mode, custom dropdown/combobox, consent AI, dan keadaan provider AI.
- E2E: navigasi halaman, resize window layout, interaksi kartu, kondisi no-device, error ADB, progress/cancel, clear logs, settings validation, semua dropdown kustom, serta AI-disabled/provider-error/cloud-consent flows.
- Typecheck dan lint harus lulus.
- Supabase: tes kebijakan RLS (pengguna A tidak dapat membaca/mengubah data pengguna atau tim lain), validasi payload sinkron tersanitasi, antrean offline dan sinkron ulang, konflik sinkron, logout, dan hapus data cloud.

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
- [ ] Navigasi, selection state, Auto Detect, progress, log, clear log, settings, AI Assistant, dan help berfungsi.
- [ ] Semua dropdown visual merupakan custom dropdown aksesibel; tidak ada popup native browser yang terlihat.
- [ ] AI tidak mengirim konteks sensitif tanpa persetujuan dan tidak mengeksekusi perintah perangkat.
- [ ] AI unavailable/offline tidak merusak fungsi diagnosis inti.
- [ ] Tindakan berisiko data jelas diperingatkan dan tidak dieksekusi pada MVP.
- [ ] Tidak ada arbitrary shell execution atau command untuk menonaktifkan FRP.
- [ ] Tidak ada data sensitif yang disimpan/diekspor tanpa kebutuhan dan pemberitahuan.
- [ ] Supabase: RLS aktif di semua tabel, tidak ada secret key di aplikasi/repo, aplikasi berfungsi penuh tanpa login, dan sinkron hanya berjalan setelah consent.
- [ ] Unit/component tests, lint, dan typecheck lulus.
- [ ] E2E test utama lulus; keterbatasan tes hardware didokumentasikan.
- [ ] Installer Windows diuji pada instalasi bersih.
- [ ] README berisi langkah instalasi development, build, troubleshooting ADB, dan batas fitur yang belum tersedia.
- [ ] Tidak boleh menyatakan “selesai” sebelum bukti test dan build benar-benar tersedia.

## 15. Tahap Pengiriman

1. **Milestone 1 — Visual shell:** layout statis dengan data demo yang ditandai, semua halaman dan responsive window behaviour.
2. **Milestone 2 — Live diagnostics:** deteksi ADB/Fastboot, device snapshot, status, progress, log, dan error path.
3. **Milestone 3 — Local persistence & cloud opsional:** SQLite, history, clear/export, settings, custom dropdowns; project Supabase khusus, migrasi skema + RLS, Auth teknisi, sinkron/backup tersanitasi (opt-in), dan laporan bersama tim.
4. **Milestone 4 — AI Assistant:** provider adapter, consent, log redaction, safe triage, error/fallback flows; backend AI tepercaya melalui Supabase Edge Functions (secret di server).
5. **Milestone 5 — Quality and release:** test suite, security review, hardware matrix, installer.

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
- Supabase Row Level Security: <https://supabase.com/docs/guides/database/postgres/row-level-security>
- Supabase API keys (publishable vs secret): <https://supabase.com/docs/guides/api/api-keys>
- Supabase Auth: <https://supabase.com/docs/guides/auth>
- Supabase Edge Functions secrets: <https://supabase.com/docs/guides/functions/secrets>
