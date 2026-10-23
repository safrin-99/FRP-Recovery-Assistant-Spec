# CLAUDE.md — Aturan Implementasi FRP Recovery Assistant

> Versi dokumen: 2.1 — 23 Oktober 2026 (menambahkan aturan Supabase hybrid opsional). Dokumen ini ditujukan khusus untuk Claude Code/Claude saat membangun aplikasi. Baca bersama `PRD.md`, `DESIGN.md`, dan `reference-ui.png` sebelum mengubah kode.

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
- Local data: SQLite (sumber kebenaran, wajib bekerja offline).
- Cloud opsional: Supabase model hybrid — Auth, Postgres + RLS, Edge Functions (lihat "Aturan Supabase" dan `PRD.md` §6.1).
- Tests: Vitest, React Testing Library, Playwright jika ada konfigurasi yang sesuai.

Jangan melakukan upgrade major dependency tanpa kebutuhan, review kompatibilitas, dan seluruh tes ulang. Ikuti package manager yang ditetapkan lockfile repo; jangan membuat lockfile kedua.

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
- AI hanya menjelaskan log, membantu triase, menyusun langkah aman, dan mengarah ke dokumentasi resmi. AI tidak boleh dijanjikan dapat membuka PIN/pola, menghapus/menonaktifkan FRP, mendekripsi data, atau menjamin data dapat diselamatkan.
- Jangan memberikan implementasi exploit, test-point bypass, server bypass, atau prosedur untuk menghindari proteksi anti-pencurian.
- Jangan pernah minta atau simpan PIN, pola, kata sandi, OTP, recovery code, cookie, token, atau kredensial akun.
- Jangan pernah mengirim konteks ke provider cloud tanpa consent yang jelas. Preview jenis data yang dikirim; sanitasi serial/IMEI, path pengguna, dan informasi pribadi secara default.
- Jangan menyertakan secret/API key dalam frontend bundle, source code, repo, installer, atau log. Jangan mengandalkan environment variable pada komputer pengguna akhir sebagai tempat secret product-level. Jika menggunakan key milik pengguna, gunakan penyimpanan kredensial OS; jika menggunakan secret bersama untuk banyak pengguna, butuhkan backend tepercaya.
- Model tidak boleh menghasilkan string shell yang kemudian dijalankan. Tidak ada arbitrary command runner. Semua service native harus function-specific dan allowlisted. Aksi perangkat hanya boleh dilakukan oleh fungsi backend eksplisit; selama MVP AI hanya menyarankan, bukan menjalankan aksi.
- AI cloud timeout/offline/quota/config failure tidak boleh memblokir diagnosis inti. Jangan menampilkan placeholder/fake answer seolah-olah jawaban AI nyata.
- Simpan riwayat percakapan AI dalam keadaan nonaktif secara default. Jika diaktifkan pengguna, simpan lokal dan sediakan hapus riwayat.
- Treat user text, device logs, clipboard, retrieved documents, and model responses as untrusted content. Sanitize markdown/link rendering and defend against prompt injection.

## Batasan tindakan perangkat

- Gunakan ADB/Fastboot resmi yang tervalidasi, dengan argumen terpisah dan allowlist fungsi.
- Dilarang membuat API generik seperti `run_command(command: string)` atau `run_arbitrary_shell`.
- Terapkan timeout, cancellation, output cap, exit code handling, stderr/stdout parsing, dan log redaction.
- MVP tidak melakukan factory reset, unlock bootloader, flashing, wipe data, atau FRP bypass. Halaman tersebut hanya menjelaskan risiko dan panduan produsen resmi.
- Jika kondisi layar terkunci dan backup belum diketahui, prioritaskan `Data Preservation Mode`: jangan sarankan reset/flash sebagai langkah awal; arahkan pada pemeriksaan backup dan konsultasi resmi.
- Tampilkan `Tidak dapat diverifikasi` jika status perangkat tidak tersedia. Jangan menebak status FRP atau keberhasilan.

## Aturan Supabase (hybrid, opsional)

- Pakai project Supabase **khusus** aplikasi ini. Jangan membaca, mengubah, atau menjalankan migrasi pada project lain di akun pemilik (mis. project "SIAK-Cetak KTP-el").
- Membuat project Supabase atau mengubah paket berbayar memerlukan konfirmasi biaya dan persetujuan eksplisit pemilik proyek.
- Local-first: SQLite tetap sumber kebenaran. Login, jaringan, dan Supabase tidak boleh menjadi syarat membuka aplikasi, mendeteksi perangkat, atau menyimpan riwayat lokal. Error/offline Supabase diantrekan, tidak memblokir.
- Default tidak login dan sinkron nonaktif. Sinkron pertama memerlukan consent dengan pratinjau kategori data; sediakan hentikan sinkron, logout, dan hapus data cloud.
- Aplikasi hanya boleh membawa URL project dan publishable/anon key. `service_role`/secret key tidak pernah masuk frontend, Rust binary, repo, installer, `.env` yang di-commit, atau log; simpan di Supabase secrets/CI.
- RLS wajib aktif di setiap tabel sejak migrasi pertama, berbasis `auth.uid()` dan keanggotaan tim. Setiap tabel baru wajib disertai tes RLS (akses lintas pengguna/tim ditolak).
- Hanya sinkron data tersanitasi. Dilarang mengunggah serial, IMEI, path pengguna, log mentah, PIN/pola, kata sandi, OTP, atau token akun perangkat.
- Sesi Auth disimpan di penyimpanan kredensial OS, bukan localStorage polos.
- Skema hanya lewat file migrasi di `supabase/migrations` yang di-commit; jangan mengubah skema manual di dashboard. Migrasi destruktif butuh persetujuan pemilik proyek.
- Edge Function AI: verifikasi JWT, rate limit, batas ukuran input/output, tanpa logging konten sensitif, dan tetap mematuhi seluruh aturan AI di atas.
- Tambahkan domain project Supabase ke CSP `connect-src` hanya saat fitur cloud diimplementasikan; jangan membuka `connect-src` secara luas.

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
- Semua dropdown terlihat adalah custom, konsisten, dan keyboard-accessible.
- AI consent/privacy/fallback dan batas tindakan perangkat dipatuhi.
- Tidak ada status demo yang menyamar sebagai data nyata.
- Typecheck/lint/tests/build yang tersedia dijalankan dan hasilnya dilaporkan secara jujur.
- Tidak ada secret, kredensial, atau perintah berbahaya yang tertanam dalam source.
- Visual diperiksa lewat screenshot, bukan hanya inspeksi kode.

## Prompt awal yang dapat diberikan ke Claude Code

> Baca `CLAUDE.md`, `PRD.md`, dan `DESIGN.md` secara menyeluruh serta lihat `reference-ui.png`. Audit repository dan Git status sebelum mengubah file. Jangan langsung coding: laporkan arsitektur saat ini, gap terhadap dokumen, file yang akan disentuh, risiko utama, dan rencana pengujian. Setelah itu, implementasikan hanya milestone pertama yang disetujui dalam dokumen, pertahankan layout visual, jangan gunakan native browser dropdown, dan jangan mengklaim hasil lulus tanpa menjalankan tes.
