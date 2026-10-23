# FRP Recovery Assistant — Spec Pack v2.0

Paket spesifikasi untuk membangun aplikasi desktop Windows melalui Claude Code.

## Isi paket

- `PRD.md` — kebutuhan, scope, arsitektur, keamanan, AI, dropdown, pengujian, dan acceptance criteria.
- `DESIGN.md` — sistem visual, layout, design tokens, AI UI states, custom dropdown components, dan visual QA.
- `CLAUDE.md` — aturan kerja khusus Claude Code, workflow audit, implementation constraints, dan prompt awal.
- `reference-ui.png` — referensi layout/palette visual asli. Teks lama yang menyiratkan FRP bypass tidak menjadi spesifikasi operasional.

## Cara memulai di Claude Code

1. Extract folder ini ke root repository proyek.
2. Pastikan screenshot ada sebagai `reference-ui.png` pada lokasi yang sama dengan dokumen.
3. Buka Claude Code pada root repository sehingga `CLAUDE.md` terbaca.
4. Gunakan prompt awal dari bagian akhir `CLAUDE.md`. Minta Claude mengaudit repository terlebih dahulu sebelum menyentuh kode.
5. Implementasikan bertahap: visual shell → diagnosis lokal → penyimpanan → AI Assistant → quality/release.

## Keputusan penting yang sudah dikunci

- Stack target: Tauri 2, React, TypeScript, Vite, Tailwind CSS 4, Rust, SQLite, Android Platform-Tools.
- Supabase dipakai sebagai cloud **opsional** model hybrid (v2.1): akun teknisi, sinkron/backup riwayat tersanitasi, laporan bersama tim, dan backend AI tepercaya lewat Edge Functions. SQLite tetap sumber kebenaran; aplikasi berfungsi penuh tanpa login/internet. Lihat `PRD.md` §6.1.
- Produk adalah diagnosis dan pendamping pemulihan resmi, bukan tool exploit atau bypass FRP otomatis.
- AI runtime bersifat opsional/provider-agnostic dan tidak mengendalikan perangkat secara otonom.
- Seluruh dropdown UI adalah custom-styled dan tidak menampilkan popup native browser.
- Diagnostik inti harus tetap berguna walaupun AI/cloud tidak tersedia.
- Operasi wipe/reset/flash bukan bagian MVP.

**Penting:** dokumen ini adalah spesifikasi. Dokumen bukan bukti bahwa aplikasi, AI provider, atau pengujian hardware sudah diimplementasikan.

---

## Pengembangan (Milestone 1 — visual shell)

### Status saat ini

| Area | Status |
|---|---|
| UI React (9 halaman, sidebar, titlebar, panel Home) | Ada; diuji Vitest + Playwright (Edge) |
| `AppSelect` / `AppCombobox` kustom | Ada; tanpa `<select>`/`<datalist>` native, diuji keyboard |
| Mode Demo (data contoh berbadge `DEMO`) | Ada; nonaktif secara default (Settings → Mode Demo) |
| Deteksi perangkat ADB/Fastboot nyata | **Belum** — Milestone 2. Auto Detect melapor "tidak tersedia" |
| Driver check, Platform-Tools check | **Belum** — Milestone 2 |
| SQLite, riwayat log, ekspor, pengaturan permanen | **Belum** — Milestone 3 (pengaturan hanya berlaku per sesi) |
| AI Assistant (provider, consent, redaksi) | **Belum** — Milestone 4; status `Belum dikonfigurasi` |
| Supabase (Auth, sinkron/backup, laporan tim) | **Belum** — Milestone 3; project Supabase khusus belum dibuat |
| Backend AI via Supabase Edge Functions | **Belum** — Milestone 4 |
| Shell Tauri (`src-tauri/`) | Kerangka ada, **belum pernah dikompilasi** (Rust/MSVC belum terpasang) |
| Installer Windows | **Belum** — Milestone 5 |

Aplikasi tidak melakukan factory reset, flashing, unlock bootloader, penghapusan data, atau
bypass FRP, dan tidak meminta PIN/pola/kata sandi/OTP.

### Prasyarat

- Node.js ≥ 22.12 (diuji dengan 26.1.0) dan npm. Lockfile: `package-lock.json` (jangan membuat lockfile kedua).
- Untuk menjalankan aplikasi desktop (Tauri): Rust 1.99.1 via `rustup` (dikunci di
  `src-tauri/rust-toolchain.toml`), Visual Studio Build Tools dengan workload *Desktop development with C++*
  (MSVC + Windows SDK), dan WebView2 Runtime.
- Untuk diagnosis perangkat (mulai Milestone 2): Android SDK Platform-Tools resmi dari
  <https://developer.android.com/tools/releases/platform-tools>.

### Perintah

```bash
npm install          # pasang dependency sesuai lockfile
npm run dev          # UI di http://127.0.0.1:1420 (browser; kontrol jendela nonaktif di luar Tauri)
npm run typecheck    # TypeScript (app + config/e2e)
npm run lint         # ESLint, termasuk larangan <select>/<datalist> dan impor shell
npm test             # Vitest + React Testing Library
npm run test:e2e     # Playwright memakai Microsoft Edge terpasang (channel msedge)
npm run build        # typecheck + build produksi Vite ke dist/
npm run tauri dev    # jendela desktop — butuh Rust + MSVC
```

Screenshot e2e (1536×1024, 1200×760, 1100×760, 1024×640) ditulis ke `e2e/__screenshots__/actual/`
(diabaikan git) untuk dibandingkan manual dengan `reference-ui.png`. Baseline regresi piksel belum ditetapkan.

### Troubleshooting ADB (persiapan Milestone 2)

- `adb` tidak dikenali: pasang Platform-Tools resmi dan atur lokasinya (pengaturan path menyusul di Milestone 2–3).
- Perangkat `unauthorized`: buka kunci layar dan setujui dialog *Allow USB debugging* pada perangkat.
- Perangkat tidak muncul: coba kabel data lain/port USB langsung, lalu pasang driver USB resmi produsen
  (<https://developer.android.com/studio/run/oem-usb>).
