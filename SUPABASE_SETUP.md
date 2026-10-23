# Supabase Setup — FRP Recovery Assistant

## 1. Create the project

1. Create a dedicated project in Supabase Dashboard for FRP Recovery Assistant.
2. Keep ownership/admin access restricted. Do not reuse an unrelated production project without explicit approval.
3. Copy the project URL and the **publishable key** from the project's API/Data API settings.
4. Do not copy a `service_role`/secret key into this desktop application. The publishable key is expected to be public; RLS and grants must enforce access.

## 2. Configure local development

1. Copy `.env.example` to `.env.local`.
2. Fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Ensure `.env.local` is ignored by Git. Never add service-role/secret keys or database passwords to client env variables.
4. The app should validate missing/malformed config at startup and show `Supabase belum dikonfigurasi` without crashing. Local USB diagnostics can remain available in guest mode.

## 3. Apply the SQL migration

Use a current Supabase CLI and link the repository to the dedicated Supabase project, then apply the migration in `supabase/migrations/20261023000100_initial_schema.sql` using the project's approved migration workflow (for example, `supabase link` followed by `supabase db push`). Review the SQL before applying it. Do not run migrations against a production project without checking the project reference and reviewing the diff.

The migration creates tables for profiles, per-user settings, recovery cases (including sanitized reset-consent status), device snapshots, diagnosis runs/logs, and optional AI history. It grants access only to authenticated users and enables RLS. After deployment, inspect table grants, RLS policies, Auth trigger, and indexes in Supabase Dashboard.

## 4. Configure Supabase Auth

- Enable email/password authentication.
- Keep email confirmation enabled for production unless a deliberate security-reviewed product decision says otherwise.
- Configure the email sender/SMTP for production; default email delivery may be rate-limited.
- Configure exact, allowlisted redirect URL(s) for the Tauri desktop deep-link callback. Implement and test the Tauri deep-link callback before claiming verification/reset links work. Do not allow arbitrary redirect domains.
- Provide sign-up, sign-in, sign-out, expired session, verification pending, forgot-password, and error states. Diagnosis can be used in guest mode, but cloud history/settings require authenticated access.
- Set appropriate auth/rate limits. Never build a custom login system that simply trusts a frontend `user_id`.

## 5. RLS requirements

- Every private table in the exposed `public` schema must have RLS enabled.
- Policies must scope rows to `auth.uid()`, with separate policy checks for relevant SELECT/INSERT/UPDATE/DELETE operations.
- User A must not read, write, update, or delete user B's records, or attach child records to user B's parent rows.
- Signed-out clients must not access private table data.
- Do not rely on UUID unpredictability, UI filters, or the publishable key being secret.
- Run database policy tests (including two-user isolation) before treating schema as complete.

## 6. Desktop session safety

Supabase publishable key and URL are public configuration. User access/refresh tokens are not public. Use a secure storage adapter appropriate for Windows desktop, such as OS credential storage or Tauri Stronghold, and verify its behavior. Do not write session tokens to logs or plaintext config. If a verified secure session adapter is not available yet, clearly document session persistence as unimplemented rather than claiming it is secure.

## 7. Cloud data and privacy

- Do not upload device data automatically on detection. Ask the user before saving a diagnosis/log to Supabase and show categories of data that will be stored.
- Strip serial/IMEI, Windows username, local file paths, PIN/pattern, passwords, OTPs, tokens, and credentials from records/logs. `recovery_cases` stores the decision path and consent metadata, never the actual secret or pattern.
- AI history is OFF by default; saving conversation content to Supabase requires an explicit opt-in.
- If internet/auth is unavailable, continue local diagnostics, display `Belum tersimpan ke cloud`, and offer sanitized local export. Do not claim a pending sync queue exists unless it has been implemented and tested.
- Provide delete-per-record and clear-history operations that actually delete owned cloud records. Confirm bulk deletion.

## 8. Required verification checklist

- [ ] App shows a clear setup state if Supabase URL/key is missing.
- [ ] Sign-up/sign-in/sign-out and expired session behave correctly.
- [ ] Email confirmation and password recovery deep links are allowlisted and validated.
- [ ] Migrations apply cleanly to an empty project.
- [ ] RLS is enabled on all private tables.
- [ ] Signed-out requests cannot access private data.
- [ ] Two-user RLS tests prove row isolation and parent-child ownership.
- [ ] CRUD and delete cascades work.
- [ ] Recovery case and reset-consent metadata persist without PIN/pattern/password/OTP fields or secrets.
- [ ] Network loss shows offline status; diagnosis remains usable.
- [ ] Cloud save occurs only after explicit user action/consent.
- [ ] No service-role/secret key, credential, or raw identifier appears in the client bundle/repository/logs.
