# FRP Recovery Assistant — Spec Pack v2.4

Paket spesifikasi untuk membangun aplikasi desktop Windows melalui Claude Code.

## Isi paket

- `PRD.md` — kebutuhan produk, scope, arsitektur, Supabase PostgreSQL sebagai database utama, Auth/RLS, alur Screen Lock Recovery berbasis preferensi data dan consent reset per tiket, keamanan, AI, dropdown, pengujian, dan acceptance criteria.
- `DESIGN.md` — sistem visual, layout, design tokens, Auth/cloud states, custom dropdown components, dan visual QA.
- `CLAUDE.md` — aturan kerja khusus Claude Code, keamanan Supabase, workflow audit, implementation constraints, dan prompt awal.
- `SUPABASE_SETUP.md` — langkah konfigurasi proyek Supabase, migration, Auth, environment, dan checklist keamanan.
- `.env.example` — contoh konfigurasi client yang aman (tanpa secret).
- `supabase/migrations/20261023000100_initial_schema.sql` — migration SQL awal untuk skema, grants, indexes, dan RLS policies.
- `reference-ui.png` — referensi layout/palette visual. Teks mockup lama yang menyiratkan FRP bypass bukan spesifikasi operasional.

## Cara memulai di Claude Code

1. Extract paket ini ke root repository proyek.
2. Pastikan `reference-ui.png` tersedia di root yang sama dengan dokumen.
3. Baca `SUPABASE_SETUP.md` dan buat proyek Supabase yang benar-benar milik aplikasi ini; jangan mengasumsikan project ref atau key tersedia.
4. Copy `.env.example` ke `.env.local`, lalu isi URL dan publishable key dari Supabase Dashboard. Jangan menaruh service-role/secret key di aplikasi.
5. Jalankan migration SQL lewat Supabase CLI/Dashboard sesuai setup yang dijelaskan, lalu verifikasi RLS.
6. Buka Claude Code pada root repository dan gunakan prompt awal dari `CLAUDE.md`. Minta audit sebelum perubahan kode.
7. Implementasikan bertahap: visual shell → diagnosis lokal → Screen Lock Recovery dua jalur → Supabase Auth/schema/RLS + recovery case history → AI Assistant → QA/release.

## Keputusan penting yang sudah dikunci

- Target: Windows desktop via Tauri 2, React, TypeScript, Vite, Tailwind CSS 4, Rust, Android Platform-Tools.
- **Supabase PostgreSQL adalah database utama wajib** untuk data cloud persisten. Supabase Auth + RLS wajib, bukan opsional.
- Publishable key boleh berada pada client; `service_role`/secret key dan password database dilarang dibundel ke installer/source.
- Diagnosis perangkat tetap berjalan secara lokal/offline; riwayat cloud memerlukan jaringan dan login. Offline state tidak boleh dilaporkan sebagai data tersimpan.
- Simpan diagnosis ke cloud dengan persetujuan eksplisit dan sanitasi data. Riwayat AI default OFF.
- Seluruh dropdown UI adalah custom-styled; tidak menggunakan popup native browser.
- Screen Lock Recovery mengikuti pilihan pelanggan per tiket: setelah consent eksplisit kehilangan data dan preflight, guided factory reset resmi menjadi jalur operasional utama; bila data harus dipertahankan atau pilihan belum jelas, gunakan Data Preservation. Consent tidak boleh diasumsikan dari tiket lain atau kebiasaan pelanggan.
- MVP tidak menjalankan generic one-click wipe/reset, unlock bootloader, atau flashing dari komputer; panduan reset dilakukan teknisi pada perangkat berdasarkan dokumentasi resmi.
- Tidak ada tool exploit/bypass FRP otomatis.

**Penting:** file di paket adalah spesifikasi dan migration awal, bukan bukti bahwa aplikasi telah terimplementasi, Supabase sudah dikonfigurasi, atau RLS/test sudah dijalankan.

## Task implementasi untuk Claude Code

- `TASK-02-DEVICE-RECOVERY.md` berisi instruksi lanjutan setelah Task 01 selesai: audit implementasi yang ada, bedakan operasi nyata dari panduan, dan bangun hanya operasi pemulihan resmi yang kompatibel serta dapat diuji. Jangan jalankan task ini sebelum Claude menyelesaikan orientasi/audit awal.

---

## Implementasi di repository ini

### Status saat ini

| Area | Status |
|---|---|
| UI React (10 halaman, sidebar, titlebar, panel Home) | Ada; diuji Vitest + Playwright (Edge) |
| `AppSelect` / `AppCombobox` kustom | Ada; tanpa `<select>`/`<datalist>` native, diuji keyboard |
| Mode Demo (data contoh berbadge `DEMO`) | Ada; nonaktif secara default (Settings → Mode Demo) |
| Tema gelap (default) / terang | Ada; Settings → Tampilan → Tema, disimpan per komputer |
| Auto Detect + Device Info (ADB/Fastboot, read-only) | Ada; diuji dengan alat asli **tanpa ponsel**. Uji dengan ponsel fisik (authorized/unauthorized/Fastboot) **belum** |
| Screen Lock Recovery (PRD v2.4 §7.2) | Ada: intake tiket dengan preferensi data pelanggan tanpa default, Jalur A Guided Factory Reset (preflight, kesiapan akun, dialog consent per tiket, panduan resmi, checklist pasca-reset) dan Jalur B Data Preservation. Hanya panduan; **tidak ada** perintah reset/wipe/flash ke perangkat. Diuji unit/komponen + E2E (browser) |
| Supabase Auth + `recovery_cases` (simpan/riwayat/hapus) | Kode ada; diuji dengan client tiruan. **Belum** diuji terhadap project Supabase sungguhan |
| Migration + RLS | Diverifikasi lokal dengan PGlite (`npm run test:db:local`) + uji mutasi. Sudah diterapkan manual lewat SQL Editor ke project Supabase (8 tabel). Verifikasi RLS/policy di project dan tes isolasi dua akun **belum** |
| Sinkron pengaturan, riwayat log/diagnosis cloud, ekspor | **Belum** |
| AI Assistant | **Belum**; status `Belum dikonfigurasi` |
| Installer Windows | Versi uji pernah dibangun; perlu dibangun ulang untuk perubahan ini |

### Prasyarat

- Node.js ≥ 22.12 (diuji dengan 26.1.0) dan npm. Lockfile: `package-lock.json` (jangan membuat lockfile kedua).
- Aplikasi desktop (Tauri): Rust 1.99.1 via `rustup` (dikunci di `src-tauri/rust-toolchain.toml`), Visual Studio
  Build Tools dengan workload *Desktop development with C++*, dan WebView2 Runtime.
- Diagnosis perangkat: Android SDK Platform-Tools resmi dari
  <https://developer.android.com/tools/releases/platform-tools>.
- Cloud (opsional saat pengembangan): salin `.env.example` ke `.env.local`, isi URL dan **publishable key**
  project Supabase. Aplikasi menolak secret/service_role key. Tanpa konfigurasi, UI menampilkan
  `Supabase belum dikonfigurasi` dan `Belum tersimpan ke cloud`; diagnosis lokal tetap berjalan.

### Perintah

```bash
npm install          # pasang dependency sesuai lockfile
npm run dev          # UI di http://127.0.0.1:1420 (browser; kontrol jendela nonaktif di luar Tauri)
npm run typecheck    # TypeScript (app + config/e2e)
npm run lint         # ESLint, termasuk larangan <select>/<datalist> dan impor shell
npm test             # Vitest + React Testing Library
npm run test:e2e     # Playwright memakai Microsoft Edge terpasang (channel msedge)
npm run test:db:local  # migration + tes RLS di PGlite (stub auth lokal, bukan pengganti Supabase asli)
npm run build        # typecheck + build produksi Vite ke dist/
npm run tauri dev    # jendela desktop — butuh Rust + MSVC
```

Backend Rust (jalankan di `src-tauri/`): `cargo test`, `cargo clippy --all-targets -- -D warnings`, `cargo fmt --check`.

Tes RLS untuk project Supabase sungguhan: jalankan `supabase/tests/rls_recovery_cases.sql` di SQL Editor
project pengembangan setelah migration diterapkan (skrip membuat dua user uji dan menghapusnya kembali).

### Keamanan backend

- Perintah IPC hanya: `check_platform_tools`, `detect_devices`, `start_diagnosis`, `cancel_diagnosis`,
  `check_driver_status`, `open_official_link`, masing-masing diizinkan eksplisit lewat ACL. Tidak ada plugin
  shell/fs/http dan tidak ada runner perintah generik.
- adb/fastboot hanya dipanggil dengan argumen tetap, dengan timeout, pembatalan, batas output 256 KB, dan tanpa
  jendela konsol. Serial perangkat tidak dikirim ke UI dan disamarkan di log.
- Sesi Supabase hanya disimpan di memori (`persistSession: false`); penyimpanan token aman OS belum diimplementasikan,
  sehingga pengguna masuk ulang setiap membuka aplikasi.

Screenshot e2e ditulis ke `e2e/__screenshots__/actual/` (diabaikan git) untuk dibandingkan manual dengan
`reference-ui.png`. Baseline regresi piksel belum ditetapkan.

### Aset pihak ketiga

- Logo brand Samsung, Xiaomi, OPPO, vivo, HUAWEI, Motorola, dan ASUS di `src/data/brandIcons.ts` berasal dari
  [Simple Icons](https://simpleicons.org) v16.35.0 (data SVG berlisensi CC0-1.0). Merek dan logo tetap milik
  pemiliknya masing-masing; periksa pedoman merek masing-masing sebelum rilis komersial.
- realme, Infinix, dan TECNO memakai monogram huruf sampai ada aset resmi berlisensi.
- Font Inter Variable dibundel lewat `@fontsource-variable/inter` (SIL Open Font License).

### Troubleshooting ADB

- `adb` tidak dikenali: pasang Platform-Tools resmi (halaman Tools menampilkan lokasi yang dicari).
- Perangkat `unauthorized`: buka kunci layar dan setujui dialog *Allow USB debugging* pada perangkat.
- Perangkat tidak muncul: coba kabel data lain/port USB langsung, lalu pasang driver USB resmi produsen
  (<https://developer.android.com/studio/run/oem-usb>).
