-- Stub minimal lingkungan Supabase untuk menjalankan migration + tes RLS secara lokal
-- (PGlite). HANYA untuk verifikasi awal; tes sungguhan tetap wajib di project Supabase.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (
  id uuid primary key,
  instance_id uuid,
  aud text,
  role text,
  email text,
  encrypted_password text,
  email_confirmed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb
);

-- Meniru auth.uid() Supabase: diambil dari klaim JWT `sub`.
create function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid $$;

grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated;
-- Supabase memberi default privileges ke anon/authenticated; tiru agar `revoke` di migration teruji.
alter default privileges in schema public grant all on tables to anon, authenticated;
