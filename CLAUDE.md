# CLAUDE.md — Aturan Implementasi FRP Recovery Assistant

> Versi dokumen: 2.4 — 24 Oktober 2026. Dokumen ini ditujukan khusus untuk Claude Code/Claude saat membangun aplikasi. Baca bersama `PRD.md`, `DESIGN.md`, dan `reference-ui.png` sebelum mengubah kode.

## Urutan acuan wajib

1. `PRD.md` — kebutuhan produk, perilaku, scope, dan keamanan.
2. `DESIGN.md` — layout, design tokens, komponen, dropdown custom, dan AI UI states.
3. `reference-ui.png` — acuan visual komposisi/palette. Teks mockup lama yang mengatakan “Bypass” bukan spesifikasi fungsional.
4. Aturan teknis di file ini — workflow, kualitas, dan verification.

Jika ada konflik antara mockup lama dengan PRD/DESIGN, ikuti PRD/DESIGN. Jangan mengubah stack, identitas produk, tata letak utama, warna, tipografi, label tindakan, atau fitur tanpa persetujuan pemilik proyek.

## Peran dan standar kerja

- Bertindak sebagai full-stack engineer senior: audit sebelum edit, minimalkan perubahan yang tidak perlu, jaga kualitas visual dan keamanan.
- Jangan membuat klaim bahwa fitur/build/test berhasil sebelum menjalankannya dan memeriksa outputnya.
- Jangan menebak isi repo. Periksa struktur, file konfigurasi, dependency lockfile, scripts yang tersedia, kondisi Git, dan code path yang sudah ada terlebih dahulu.
- Pertahankan perubahan pengguna. Jangan menjalankan perintah Git destruktif seperti reset hard, clean, atau force push.
- Sebelum tugas besar: tulis rencana singkat dengan file yang akan disentuh dan cara verifikasi. Implementasikan secara bertahap, review diff, jalankan tes yang tersedia.
- Jangan mengganti komponen yang sudah bekerja dengan mock/demo hanya agar visual tampak benar. Demo harus terpisah dan diberi label `DEMO`.

## Stack yang dipatok

- Desktop: Tauri 2.
- UI: React + TypeScript + Vite.
- Styling: Tailwind CSS 4 + CSS custom properties dari `DESIGN.md`.
- Icon: Lucide React.
- Dropdown: custom-styled Radix UI Select/primitive aksesibel setara.
- State: Zustand untuk state lintas halaman; React local state untuk kontrol sederhana.
- Validation: Zod.
- Native/service layer: Rust.
- Device tools: Android SDK Platform-Tools resmi (ADB/Fastboot), dengan command allowlist.
- **Database utama wajib:** Supabase PostgreSQL melalui `@supabase/supabase-js` over HTTPS, dengan Supabase Auth dan RLS untuk seluruh tabel privat. Supabase adalah sumber kebenaran riwayat/profil/preferensi cloud. Diagnosis perangkat tetap lokal via Rust/Tauri. SQLite bukan database utama dan tidak wajib pada MVP.
- Tests: Vitest, React Testing Library, Playwright jika ada konfigurasi yang sesuai.

Jangan melakukan upgrade major dependency tanpa kebutuhan, review kompatibilitas, dan seluruh tes ulang. Ikuti package manager yang ditetapkan lockfile repo; jangan membuat lockfile kedua.


## Supabase — database utama wajib, bukan opsional

- Jangan melewatkan database cloud. Gunakan Supabase PostgreSQL sebagai sumber kebenaran untuk profil, preferensi cloud, riwayat diagnosis/log yang telah disanitasi, dan riwayat AI jika opt-in.
- Gunakan `@supabase/supabase-js` dalam satu layer client/repository terpusat. Jangan menyebarkan query database ke komponen presentasional. Device diagnostics/ADB/Fastboot tetap dilakukan oleh Rust/local services.
- Implementasikan Supabase Auth email/password untuk cloud data: sign-up, sign-in, sign-out, session lifecycle, password recovery/verification, error/rate-limit states. Mode tamu tetap bisa menggunakan diagnosis lokal; cloud save/history perlu login.
- Simpan SQL migrations dalam `supabase/migrations/`. Sertakan setup notes dan `.env.example` untuk `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY`. `.env.local` tidak boleh masuk Git.
- Publishable key/project URL memang dapat ditemukan dari desktop package dan bukan secret. Jangan pernah membundel Supabase `service_role`/secret key, database password, privileged connection string, atau service credentials. Jangan mengklaim publishable key menjaga database aman tanpa RLS.
- Aktifkan RLS pada setiap tabel privat dan buat policy eksplisit untuk SELECT/INSERT/UPDATE/DELETE yang memeriksa `auth.uid()`. Berikan grants minimum. Uji isolasi dua akun; row user A tidak boleh bisa dibaca/diubah/dihapus oleh user B atau signed-out client.
- Jangan hanya mengandalkan filter UI atau `user_id` kiriman frontend. Terapkan kepemilikan data di database/RLS, foreign key/check constraints, dan hubungan child-parent dengan pemilik sama.
- Simpan diagnostic data ke cloud hanya setelah pengguna memilih save/consent; sanitize serial/IMEI, path lokal, nama user Windows, PIN, password, OTP, tokens, dan semua kredensial. AI conversation history default OFF dan harus opt-in.
- Supabase offline berarti cloud history/settings tidak tersedia; diagnosis lokal tidak boleh berhenti. UI harus menyatakan `Belum tersimpan ke cloud` dan menawarkan ekspor lokal sanitasi. Jangan klaim ada offline queue/sync jika belum diimplementasikan dan dites.
- Pengaturan UI non-sensitif boleh menggunakan Tauri Store bila diperlukan, tetapi bukan sebagai pengganti data cloud utama. Tidak wajib menggunakan SQLite pada MVP. Jangan menambahkan SQLite sebagai database utama, localStorage, JSON atau mock data sebagai pengganti Supabase.
- Gunakan secure storage yang sesuai untuk sesi/refresh token desktop (contohnya OS credential store atau Tauri Stronghold lewat adapter yang diuji); jangan menulis token ke plaintext config/log. Redirect verifikasi/reset harus allowlisted dan ditangani deep-link resmi yang divalidasi.
- Tambahkan tes untuk migrations/schema, CRUD `recovery_cases`, RLS two-user isolation, signed-out denial, cross-owner child references, deletion cascades, expired session, offline/timeout, failure retry, reset-consent state machine, data-loss warnings, and log sanitization. Jangan menyatakan database aman/selesai sampai migration dan tes benar-benar dijalankan.

## Aturan dropdown — wajib dipatuhi

- **Jangan gunakan `<select>` native browser atau `<datalist>` untuk UI pilihan yang terlihat.** Jangan membiarkan popup default browser muncul pada halaman mana pun.
- Gunakan satu reusable `AppSelect` custom-styled berbasis Radix UI Select/primitive aksesibel. Untuk daftar dengan pencarian gunakan `AppCombobox` custom.
- Terapkan pada semua halaman: pengaturan, filter log, bahasa, tema, provider AI, model, metode, serta form lain yang memiliki pilihan.
- Ikuti tokens dari `DESIGN.md`. States yang relevan wajib mencakup default, hover, focus-visible, selected, disabled, open, loading, empty, dan error.
- Keyboard wajib berfungsi (Enter/Space, Arrow Up/Down, Escape, fokus kembali ke trigger, typeahead/search bila sesuai). Pastikan label/ARIA, click-outside, popup placement/portal, scroll internal, dan window resize bekerja.
- Native OS file picker hanya boleh digunakan untuk dialog pilih file/folder, bukan sebagai dropdown pilihan aplikasi.
- Tambahkan component/e2e test agar regression ke native dropdown dapat ditemukan.

## AI di dalam aplikasi: aturan arsitektur dan privasi

- Claude adalah coding agent yang membangun aplikasi. Itu **tidak otomatis berarti** aplikasi runtime memakai Claude sebagai model AI. Provider AI runtime adalah integrasi terpisah dan harus dapat dikonfigurasi.
- Definisikan adapter `AiProvider`; jangan mengikat komponen UI ke provider tertentu.
- Diagnosis, status perangkat, dan hasil command berasal dari service lokal yang dapat diverifikasi, bukan jawaban model.
- AI membantu teknisi mengikuti preferensi data pelanggan per tiket. Jika pelanggan eksplisit menyetujui kehilangan data dan preflight terpenuhi, rekomendasikan Guided Factory Reset resmi. Jika data harus dipertahankan atau pilihan belum diputuskan, arahkan ke Data Preservation. AI tidak boleh menjanjikan membuka PIN/pola tanpa kredensial, mendekripsi data, menonaktifkan FRP, atau menjamin data dapat diselamatkan.
- Jangan memberikan implementasi exploit, test-point bypass, server bypass, atau prosedur untuk menghindari proteksi anti-pencurian.
- Jangan pernah minta atau simpan PIN, pola, kata sandi, OTP, recovery code, cookie, token, atau kredensial akun.
- Jangan pernah mengirim konteks ke provider cloud tanpa consent yang jelas. Preview jenis data yang dikirim; sanitasi serial/IMEI, path pengguna, dan informasi pribadi secara default.
- Jangan menyertakan secret/API key dalam frontend bundle, source code, repo, installer, atau log. Jangan mengandalkan environment variable pada komputer pengguna akhir sebagai tempat secret product-level. Jika menggunakan key milik pengguna, gunakan penyimpanan kredensial OS; jika menggunakan secret bersama untuk banyak pengguna, butuhkan backend tepercaya.
- Model tidak boleh menghasilkan string shell yang kemudian dijalankan. Tidak ada arbitrary command runner. Semua service native harus function-specific dan allowlisted. Aksi perangkat hanya boleh dilakukan oleh fungsi backend eksplisit; selama MVP AI hanya menyarankan, bukan menjalankan aksi.
- AI cloud timeout/offline/quota/config failure tidak boleh memblokir diagnosis inti. Jangan menampilkan placeholder/fake answer seolah-olah jawaban AI nyata.
- Simpan riwayat percakapan AI dalam keadaan nonaktif secara default. Jika diaktifkan pengguna, simpan ke Supabase di akun pengguna dan sediakan hapus riwayat; jangan simpan sistem prompt atau kredensial.
- Treat user text, device logs, clipboard, retrieved documents, and model responses as untrusted content. Sanitize markdown/link rendering and defend against prompt injection.

## Batasan tindakan perangkat

- Gunakan ADB/Fastboot resmi yang tervalidasi, dengan argumen terpisah dan allowlist fungsi.
- Dilarang membuat API generik seperti `run_command(command: string)` atau `run_arbitrary_shell`.
- Terapkan timeout, cancellation, output cap, exit code handling, stderr/stdout parsing, dan log redaction.
- Screen Lock Recovery wajib mengikuti pilihan data pelanggan per tiket: `Guided Factory Reset` adalah jalur operasional utama hanya setelah consent eksplisit kehilangan data dan preflight terpenuhi; `Data Preservation` dipakai jika pelanggan ingin mempertahankan data atau belum memutuskan.
- Jalur A harus memeriksa opsi resmi/non-destruktif yang mungkin tersedia, backup yang bisa diverifikasi, dan eskalasi servis resmi. Jika tidak ada jalur sah yang dapat membuka layar sambil mempertahankan data, nyatakan batasan dengan jelas dan jangan menyarankan exploit atau bypass.
- Jalur B boleh memandu factory reset melalui dokumentasi resmi brand/model setelah preflight, peringatan kehilangan data, pertimbangan kredensial Google/Xiaomi pasca-reset, konfirmasi otorisasi, dan persetujuan eksplisit pemilik. Untuk MVP, jangan menjalankan generic one-click wipe, flashing, atau unlock bootloader dari komputer.
- Jangan membuat atau menetapkan PIN/pola baru dari desktop ke layar yang masih terkunci. Setelah perangkat dipulihkan/reset dan pemilik mencapai setup/akses sah, pandu pemilik untuk menetapkan PIN/pola baru langsung pada perangkat.
- Jangan mengasumsikan persetujuan reset berdasarkan kebiasaan pelanggan lain. Catat consent eksplisit untuk setiap tiket. Jika pelanggan memilih reset, jelaskan bahwa data lokal terhapus dan FRP/aktivasi akun Google/Xiaomi mungkin tetap diminta; jika akun yang diperlukan tidak diketahui, sarankan pemulihan akun resmi sebelum reset. Catat consent dan outcome tersanitasi ke `recovery_cases` di Supabase.
- Tampilkan `Tidak dapat diverifikasi` jika status perangkat tidak tersedia. Jangan menebak status FRP atau keberhasilan.

## Standar visual

- Target comparison: 1536×1024, sesuai `reference-ui.png`.
- Pertahankan sidebar + main workspace + panel informasi/progres; jangan merombak menjadi template dashboard generik.
- Gunakan token warna, tipografi, radius, spacing, dan motion dari `DESIGN.md`.
- Font runtime tidak boleh bergantung pada Google Fonts/network; gunakan font lokal yang telah diizinkan atau fallback yang dirancang.
- Jangan gunakan emoji sebagai ikon UI; gunakan Lucide/assets yang sah.
- Pastikan states diimplementasikan benar: loading, disabled, error, empty, success, no device, demo, AI unavailable, consent canceled.
- Setiap tombol/permukaan yang terlihat interaktif wajib punya aksi nyata; jangan membuat control dekoratif yang berpura-pura berfungsi.

## Workflow untuk setiap tugas

1. Baca file dan konteks kode yang relevan; jangan asumsikan repo baru atau kosong.
2. Periksa `git status --short`, lockfile, `package.json`, `src-tauri/Cargo.toml`, dan scripts yang benar-benar tersedia bila path tersebut ada.
3. Buat rencana pendek dan sebutkan asumsi atau risiko utama.
4. Implementasikan dalam potongan kecil dengan file/component boundaries jelas.
5. Setelah edit, review diff untuk masalah keamanan, hardcoded fake status, dropdown native, dan styling yang menyimpang.
6. Jalankan perintah yang benar-benar tersedia dari repo. Umumnya: lint, typecheck, unit/component tests, build frontend, `cargo test` bila workspace Rust mendukung, serta E2E/screenshot bila sudah dikonfigurasi.
7. Jika sebuah test/build tidak dapat dijalankan, laporkan sebagai belum diverifikasi dan jelaskan blocker; jangan mengarang hasil atau menambahkan dependency besar hanya untuk menampilkan hijau.
8. Untuk perubahan UI, ambil screenshot dan bandingkan di 1536×1024 serta ukuran window lebih kecil bila tool tersedia.
9. Akhiri dengan ringkasan file yang berubah, perilaku yang ditambahkan, hasil tiap test (perintah dan status), serta keterbatasan yang masih terbuka.

## Definition of Done

- `PRD.md` dan `DESIGN.md` diikuti.
- Screen Lock Recovery mengikuti preferensi data per tiket; consent eksplisit membuat Guided Factory Reset resmi menjadi jalur utama, sedangkan Data Preservation digunakan jika data harus dipertahankan atau keputusan belum jelas.
- Sistem tidak mengklaim bisa mengganti PIN/pola di perangkat yang masih terkunci; pengaturan kunci baru dilakukan pemilik langsung pada perangkat setelah akses/setup sah.
- Semua dropdown terlihat adalah custom, konsisten, dan keyboard-accessible.
- AI consent/privacy/fallback dan batas tindakan perangkat dipatuhi.
- Tidak ada status demo yang menyamar sebagai data nyata.
- Typecheck/lint/tests/build yang tersedia dijalankan dan hasilnya dilaporkan secara jujur.
- Tidak ada secret, kredensial, atau perintah berbahaya yang tertanam dalam source.
- Visual diperiksa lewat screenshot, bukan hanya inspeksi kode.

## Prompt awal yang dapat diberikan ke Claude Code

> Baca `CLAUDE.md`, `PRD.md`, `DESIGN.md`, `SUPABASE_SETUP.md`, dan lihat `reference-ui.png`. Audit repository dan Git status sebelum mengubah file. Halaman `Screen Lock Recovery` harus meminta preferensi data per tiket. Jika pelanggan secara eksplisit menyetujui kehilangan data dan preflight terpenuhi, `Guided Factory Reset` resmi menjadi jalur operasional utama; jika data harus dipertahankan atau belum diputuskan, gunakan `Data Preservation`. MVP memandu reset pada perangkat melalui petunjuk resmi; jangan membuat generic one-click wipe, exploit/bypass FRP, atau perintah shell hasil AI. Sebelum reset, jelaskan risiko data lokal dan potensi permintaan kredensial akun Google/Xiaomi setelah reset. Setelah perangkat berhasil diaktifkan, pelanggan menetapkan PIN/pola baru langsung di HP; aplikasi desktop tidak dapat mengganti kunci di perangkat yang masih terkunci.
>
> Supabase PostgreSQL adalah database utama WAJIB MVP: audit env config, Auth flow, Supabase client/data-access layer, SQL migrations termasuk `recovery_cases`, RLS/grants, ownership constraints, cloud status, case/history/logs, consent metadata, deletion/export, offline/error handling, dan tests. Jangan membundel `service_role`/secret key. Diagnosis lokal tetap tersedia offline; cloud history memerlukan login/koneksi. Jangan mengganti database utama dengan SQLite, localStorage, JSON, atau mock data. Jangan langsung coding: laporkan arsitektur saat ini, gap terhadap dokumen, kondisi Supabase, file yang akan disentuh, risiko utama, dan rencana pengujian. Setelah itu, implementasikan hanya milestone pertama yang disetujui dalam dokumen, pertahankan layout visual premium, seluruh dropdown harus custom (bukan native browser), dan jangan mengklaim hasil lulus tanpa menjalankan tes.


## Referensi Supabase yang wajib dipatuhi

- Secure data/RLS: https://supabase.com/docs/guides/database/secure-data
- Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Publishable vs secret keys: https://supabase.com/docs/guides/getting-started/api-keys
- Email/password Auth: https://supabase.com/docs/guides/auth/passwords
- Auth redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
