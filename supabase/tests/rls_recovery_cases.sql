-- Tes RLS & constraint untuk skema `supabase/migrations/20261023000100_initial_schema.sql`
-- (PRD v2.4 §11, SUPABASE_SETUP.md §8). Jalankan di project pengembangan (SQL Editor/psql)
-- SETELAH migration diterapkan. Skrip membuat dua user uji, menguji sebagai `authenticated`
-- dan `anon`, lalu menghapus user uji (cascade). Kegagalan memicu exception sehingga seluruh
-- transaksi dibatalkan dan tidak ada data uji yang tertinggal.

begin;

-- Dua user uji (UUID tetap; dihapus di akhir skrip).
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values
  ('a1111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'rls-user-a@example.test', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('b2222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'rls-user-b@example.test', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb);

-- Trigger pengguna baru membuat profiles + app_settings (riwayat AI default OFF).
do $$
begin
  if (select count(*) from public.profiles where id in ('a1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222')) <> 2 then
    raise exception 'TEST FAILED: trigger tidak membuat profiles';
  end if;
  if exists (select 1 from public.app_settings where user_id = 'a1111111-1111-4111-8111-111111111111' and ai_history_enabled) then
    raise exception 'TEST FAILED: ai_history_enabled harus default false';
  end if;
  -- Tidak ada kolom kredensial/identifier permanen di recovery_cases.
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'recovery_cases'
       and column_name ~* '(pin|pattern|password|otp|token|imei|serial|email)'
  ) then
    raise exception 'TEST FAILED: recovery_cases memiliki kolom kredensial/identifier';
  end if;
end $$;

-- ---------------------------------------------------------------- sebagai user A
select set_config('request.jwt.claims', '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;

insert into public.recovery_cases (id, user_id, ticket_code, brand, issue_type, data_priority)
values ('c3333333-3333-4333-8333-333333333333', 'a1111111-1111-4111-8111-111111111111',
        'SLR-20261024-AAAA', 'xiaomi', 'screen_pin_pattern', 'unknown');

do $$
begin
  -- A tidak boleh membuat baris atas nama B.
  begin
    insert into public.recovery_cases (user_id, brand, issue_type)
    values ('b2222222-2222-4222-8222-222222222222', 'xiaomi', 'screen_pin_pattern');
    raise exception 'TEST FAILED: A bisa membuat kasus atas nama B';
  exception when insufficient_privilege then null;
  end;

  -- Nilai enum di luar daftar ditolak.
  begin
    insert into public.recovery_cases (user_id, brand, issue_type)
    values ('a1111111-1111-4111-8111-111111111111', 'xiaomi', 'frp_bypass');
    raise exception 'TEST FAILED: issue_type tidak valid diterima';
  exception when check_violation then null;
  end;

  -- Consent diterima tanpa waktu ditolak.
  begin
    update public.recovery_cases set owner_authorization_confirmed = true, reset_consent_status = 'accepted'
     where id = 'c3333333-3333-4333-8333-333333333333';
    raise exception 'TEST FAILED: consent tanpa waktu diterima';
  exception when check_violation then null;
  end;

  -- Consent diterima tanpa izin pemilik ditolak.
  begin
    update public.recovery_cases set reset_consent_status = 'accepted', reset_consent_at = now()
     where id = 'c3333333-3333-4333-8333-333333333333';
    raise exception 'TEST FAILED: consent tanpa izin pemilik diterima';
  exception when check_violation then null;
  end;

  -- Jalur Guided Factory Reset tanpa consent ditolak.
  begin
    update public.recovery_cases set owner_authorization_confirmed = true, chosen_path = 'guided_factory_reset'
     where id = 'c3333333-3333-4333-8333-333333333333';
    raise exception 'TEST FAILED: jalur reset tanpa consent diterima';
  exception when check_violation then null;
  end;

  -- Riwayat AI tidak boleh dibuat selama ai_history_enabled = false.
  begin
    insert into public.ai_conversations (user_id) values ('a1111111-1111-4111-8111-111111111111');
    raise exception 'TEST FAILED: percakapan AI tersimpan walau riwayat AI OFF';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Consent eksplisit lengkap → jalur reset diterima.
update public.recovery_cases
   set owner_authorization_confirmed = true,
       data_priority = 'not_important',
       post_reset_account_readiness = 'xiaomi_ready',
       reset_consent_status = 'accepted',
       reset_consent_at = now(),
       consent_text_version = 'slr-reset-consent-2026-10-24',
       chosen_path = 'guided_factory_reset',
       status = 'in_progress'
 where id = 'c3333333-3333-4333-8333-333333333333';

-- Snapshot + run + log milik A untuk uji cascade dan kepemilikan child.
insert into public.device_snapshots (id, user_id, brand, transport)
values ('e5555555-5555-4555-8555-555555555555', 'a1111111-1111-4111-8111-111111111111', 'xiaomi', 'usb');
insert into public.diagnostic_runs (id, user_id, device_snapshot_id, category, status)
values ('d4444444-4444-4444-8444-444444444444', 'a1111111-1111-4111-8111-111111111111',
        'e5555555-5555-4555-8555-555555555555', 'screen_lock_recovery', 'running');
insert into public.diagnostic_logs (user_id, run_id, level, message)
values ('a1111111-1111-4111-8111-111111111111', 'd4444444-4444-4444-8444-444444444444', 'info', 'Tiket dibuat.');

-- ---------------------------------------------------------------- sebagai user B
reset role;
select set_config('request.jwt.claims', '{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  affected integer;
begin
  if exists (select 1 from public.recovery_cases where id = 'c3333333-3333-4333-8333-333333333333') then
    raise exception 'TEST FAILED: B dapat membaca kasus A';
  end if;
  if exists (select 1 from public.profiles where id = 'a1111111-1111-4111-8111-111111111111') then
    raise exception 'TEST FAILED: B dapat membaca profil A';
  end if;
  if exists (select 1 from public.diagnostic_logs where user_id = 'a1111111-1111-4111-8111-111111111111') then
    raise exception 'TEST FAILED: B dapat membaca log A';
  end if;

  update public.recovery_cases set outcome_summary = 'diubah B' where id = 'c3333333-3333-4333-8333-333333333333';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'TEST FAILED: B dapat mengubah kasus A'; end if;

  delete from public.recovery_cases where id = 'c3333333-3333-4333-8333-333333333333';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'TEST FAILED: B dapat menghapus kasus A'; end if;

  -- B tidak boleh menautkan child miliknya ke parent milik A (FK komposit).
  begin
    insert into public.diagnostic_runs (user_id, device_snapshot_id, category, status)
    values ('b2222222-2222-4222-8222-222222222222', 'e5555555-5555-4555-8555-555555555555', 'device_info', 'running');
    raise exception 'TEST FAILED: B dapat menautkan run ke snapshot A';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.diagnostic_logs (user_id, run_id, level, message)
    values ('b2222222-2222-4222-8222-222222222222', 'd4444444-4444-4444-8444-444444444444', 'info', 'x');
    raise exception 'TEST FAILED: B dapat menautkan log ke run A';
  exception when foreign_key_violation then null;
  end;
end $$;

-- ---------------------------------------------------------------- tanpa login (anon)
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

do $$
begin
  begin
    perform 1 from public.recovery_cases limit 1;
    raise exception 'TEST FAILED: anon dapat membaca recovery_cases';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.recovery_cases (user_id, brand, issue_type)
    values ('a1111111-1111-4111-8111-111111111111', 'xiaomi', 'screen_pin_pattern');
    raise exception 'TEST FAILED: anon dapat menulis recovery_cases';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ---------------------------------------------------------------- kembali sebagai A: data utuh, cascade
reset role;
select set_config('request.jwt.claims', '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;

do $$
begin
  if not exists (
    select 1 from public.recovery_cases
     where id = 'c3333333-3333-4333-8333-333333333333' and outcome_summary is null
       and reset_consent_status = 'accepted' and chosen_path = 'guided_factory_reset'
       and consent_text_version = 'slr-reset-consent-2026-10-24'
  ) then
    raise exception 'TEST FAILED: kasus A berubah/hilang atau consent tidak tersimpan';
  end if;

  delete from public.diagnostic_runs where id = 'd4444444-4444-4444-8444-444444444444';
  if exists (select 1 from public.diagnostic_logs where run_id = 'd4444444-4444-4444-8444-444444444444') then
    raise exception 'TEST FAILED: log tidak ikut terhapus (cascade)';
  end if;

  delete from public.recovery_cases where id = 'c3333333-3333-4333-8333-333333333333';
  if exists (select 1 from public.recovery_cases where id = 'c3333333-3333-4333-8333-333333333333') then
    raise exception 'TEST FAILED: A tidak dapat menghapus kasusnya sendiri';
  end if;
end $$;

-- ---------------------------------------------------------------- bersih-bersih
reset role;
delete from auth.users
 where id in ('a1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222');

commit;

select 'RLS_TESTS_PASSED' as result;
