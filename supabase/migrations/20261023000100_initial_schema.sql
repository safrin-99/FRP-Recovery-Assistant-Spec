-- FRP Recovery Assistant: initial Supabase schema.
-- Review before applying to a project. Private data is protected by Auth + RLS.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text check (email is null or char_length(email) <= 320),
  display_name text not null default '' check (char_length(display_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(preferences) = 'object'),
  ai_history_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);



-- Technician recovery case. Never store the customer's actual PIN/pattern/password/OTP.
create table if not exists public.recovery_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ticket_code text check (ticket_code is null or char_length(ticket_code) <= 80),
  brand text not null check (char_length(brand) between 1 and 60),
  model text check (model is null or char_length(model) <= 120),
  issue_type text not null check (issue_type in ('screen_pin_pattern', 'app_lock', 'privacy_lock', 'google_account', 'frp_after_reset', 'xiaomi_account', 'boot_or_system', 'other')),
  data_priority text not null default 'preserve' check (data_priority in ('preserve', 'not_important', 'unknown')),
  backup_status text not null default 'unknown' check (backup_status in ('not_checked', 'available_verified', 'partial', 'none', 'unknown')),
  post_reset_account_readiness text not null default 'unknown' check (post_reset_account_readiness in ('unknown', 'google_ready', 'xiaomi_ready', 'both_ready', 'recovery_needed', 'not_applicable')),
  access_state text not null default 'unknown' check (access_state in ('home_access', 'biometric_maybe_available', 'locked_screen', 'recovery', 'fastboot', 'boot_setup', 'unknown')),
  owner_authorization_confirmed boolean not null default false,
  chosen_path text not null default 'data_preservation' check (chosen_path in ('data_preservation', 'account_recovery', 'guided_factory_reset', 'official_service', 'unresolved')),
  reset_consent_status text not null default 'not_requested' check (reset_consent_status in ('not_requested', 'pending', 'accepted', 'declined')),
  reset_consent_at timestamptz,
  consent_text_version text check (consent_text_version is null or char_length(consent_text_version) <= 40),
  status text not null default 'open' check (status in ('open', 'in_progress', 'awaiting_owner', 'completed', 'blocked', 'cancelled')),
  outcome_summary text check (outcome_summary is null or char_length(outcome_summary) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint recovery_cases_reset_consent_timestamp_check
    check (reset_consent_status <> 'accepted' or (reset_consent_at is not null and owner_authorization_confirmed = true)),
  constraint recovery_cases_guided_reset_requires_consent
    check (chosen_path <> 'guided_factory_reset' or (reset_consent_status = 'accepted' and reset_consent_at is not null and owner_authorization_confirmed = true))
);

create table if not exists public.device_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand text not null check (char_length(brand) between 1 and 60),
  model text check (model is null or char_length(model) <= 120),
  model_code text check (model_code is null or char_length(model_code) <= 120),
  android_version text check (android_version is null or char_length(android_version) <= 80),
  security_patch text check (security_patch is null or char_length(security_patch) <= 40),
  transport text not null default 'unknown' check (transport in ('usb', 'adb', 'fastboot', 'unknown')),
  -- "authorization" adalah kata kunci tercadang PostgreSQL; wajib di-quote agar migration dapat diterapkan.
  "authorization" text not null default 'unknown' check ("authorization" in ('authorized', 'unauthorized', 'offline', 'unavailable', 'unknown')),
  detected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.diagnostic_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_snapshot_id uuid,
  category text not null check (category in ('connection', 'device_info', 'driver', 'recovery_guidance', 'screen_lock_recovery', 'factory_reset_guidance', 'other')),
  status text not null check (status in ('running', 'completed', 'failed', 'cancelled')),
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  summary text check (summary is null or char_length(summary) <= 4000),
  error_code text check (error_code is null or char_length(error_code) <= 120),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  constraint diagnostic_runs_snapshot_owner_fk
    foreign key (device_snapshot_id, user_id)
    references public.device_snapshots(id, user_id)
    on delete restrict
);

create table if not exists public.diagnostic_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null,
  occurred_at timestamptz not null default now(),
  level text not null check (level in ('debug', 'info', 'warning', 'error')),
  message text not null check (char_length(message) between 1 and 4000),
  details_redacted jsonb not null default '{}'::jsonb check (jsonb_typeof(details_redacted) = 'object'),
  created_at timestamptz not null default now(),
  constraint diagnostic_logs_run_owner_fk
    foreign key (run_id, user_id)
    references public.diagnostic_runs(id, user_id)
    on delete cascade
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Percakapan AI' check (char_length(title) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 20000),
  provider text check (provider is null or char_length(provider) <= 80),
  created_at timestamptz not null default now(),
  constraint ai_messages_conversation_owner_fk
    foreign key (conversation_id, user_id)
    references public.ai_conversations(id, user_id)
    on delete cascade
);

create index if not exists recovery_cases_user_created_idx
  on public.recovery_cases(user_id, created_at desc);
create index if not exists device_snapshots_user_detected_idx
  on public.device_snapshots(user_id, detected_at desc);
create index if not exists diagnostic_runs_user_started_idx
  on public.diagnostic_runs(user_id, started_at desc);
create index if not exists diagnostic_logs_user_run_time_idx
  on public.diagnostic_logs(user_id, run_id, occurred_at asc);
create index if not exists ai_conversations_user_updated_idx
  on public.ai_conversations(user_id, updated_at desc);
create index if not exists ai_messages_user_conversation_time_idx
  on public.ai_messages(user_id, conversation_id, created_at asc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 120)
  )
  on conflict (id) do nothing;
  insert into public.app_settings (user_id, preferences, ai_history_enabled)
  values (new.id, '{}'::jsonb, false)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;
revoke all on function public.handle_new_auth_user() from public;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

drop trigger if exists recovery_cases_set_updated_at on public.recovery_cases;
create trigger recovery_cases_set_updated_at
before update on public.recovery_cases
for each row execute function public.set_updated_at();

drop trigger if exists ai_conversations_set_updated_at on public.ai_conversations;
create trigger ai_conversations_set_updated_at
before update on public.ai_conversations
for each row execute function public.set_updated_at();

drop trigger if exists on_auth_user_created_profile_and_settings on auth.users;
create trigger on_auth_user_created_profile_and_settings
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- No direct access for anonymous clients. Authenticated access is still constrained by RLS.
revoke all on table public.profiles, public.app_settings, public.device_snapshots,
  public.diagnostic_runs, public.diagnostic_logs, public.ai_conversations,
  public.ai_messages, public.recovery_cases from anon, authenticated;

grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.recovery_cases to authenticated;
grant select, insert, update, delete on table public.app_settings to authenticated;
grant select, insert, update, delete on table public.device_snapshots to authenticated;
grant select, insert, update, delete on table public.diagnostic_runs to authenticated;
grant select, insert, delete on table public.diagnostic_logs to authenticated;
grant select, insert, update, delete on table public.ai_conversations to authenticated;
grant select, insert, delete on table public.ai_messages to authenticated;

alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.recovery_cases enable row level security;
alter table public.device_snapshots enable row level security;
alter table public.diagnostic_runs enable row level security;
alter table public.diagnostic_logs enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

-- Profiles: creation is handled by the trusted auth.users trigger; users can read/update only their profile.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Per-user settings.
drop policy if exists app_settings_select_own on public.app_settings;
create policy app_settings_select_own on public.app_settings
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists app_settings_insert_own on public.app_settings;
create policy app_settings_insert_own on public.app_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists app_settings_update_own on public.app_settings;
create policy app_settings_update_own on public.app_settings
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists app_settings_delete_own on public.app_settings;
create policy app_settings_delete_own on public.app_settings
  for delete to authenticated using ((select auth.uid()) = user_id);



-- Recovery cases belong to the authenticated technician account. Store per-case owner/data-loss consent and readiness metadata only; never account identifiers or secrets. Reset consent is not inferred across tickets.
drop policy if exists recovery_cases_select_own on public.recovery_cases;
create policy recovery_cases_select_own on public.recovery_cases
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists recovery_cases_insert_own on public.recovery_cases;
create policy recovery_cases_insert_own on public.recovery_cases
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists recovery_cases_update_own on public.recovery_cases;
create policy recovery_cases_update_own on public.recovery_cases
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists recovery_cases_delete_own on public.recovery_cases;
create policy recovery_cases_delete_own on public.recovery_cases
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Device snapshots.
drop policy if exists device_snapshots_select_own on public.device_snapshots;
create policy device_snapshots_select_own on public.device_snapshots
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists device_snapshots_insert_own on public.device_snapshots;
create policy device_snapshots_insert_own on public.device_snapshots
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists device_snapshots_update_own on public.device_snapshots;
create policy device_snapshots_update_own on public.device_snapshots
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists device_snapshots_delete_own on public.device_snapshots;
create policy device_snapshots_delete_own on public.device_snapshots
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Diagnostic runs.
drop policy if exists diagnostic_runs_select_own on public.diagnostic_runs;
create policy diagnostic_runs_select_own on public.diagnostic_runs
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists diagnostic_runs_insert_own on public.diagnostic_runs;
create policy diagnostic_runs_insert_own on public.diagnostic_runs
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists diagnostic_runs_update_own on public.diagnostic_runs;
create policy diagnostic_runs_update_own on public.diagnostic_runs
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists diagnostic_runs_delete_own on public.diagnostic_runs;
create policy diagnostic_runs_delete_own on public.diagnostic_runs
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Logs are append-only from the client; deletion follows the explicit user's request or parent cascade.
drop policy if exists diagnostic_logs_select_own on public.diagnostic_logs;
create policy diagnostic_logs_select_own on public.diagnostic_logs
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists diagnostic_logs_insert_own on public.diagnostic_logs;
create policy diagnostic_logs_insert_own on public.diagnostic_logs
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists diagnostic_logs_delete_own on public.diagnostic_logs;
create policy diagnostic_logs_delete_own on public.diagnostic_logs
  for delete to authenticated using ((select auth.uid()) = user_id);

-- AI history must only be used if the user explicitly enabled it in app settings.
drop policy if exists ai_conversations_select_own on public.ai_conversations;
create policy ai_conversations_select_own on public.ai_conversations
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists ai_conversations_insert_own on public.ai_conversations;
create policy ai_conversations_insert_own on public.ai_conversations
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.app_settings s
      where s.user_id = (select auth.uid()) and s.ai_history_enabled = true
    )
  );
drop policy if exists ai_conversations_update_own on public.ai_conversations;
create policy ai_conversations_update_own on public.ai_conversations
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists ai_conversations_delete_own on public.ai_conversations;
create policy ai_conversations_delete_own on public.ai_conversations
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists ai_messages_select_own on public.ai_messages;
create policy ai_messages_select_own on public.ai_messages
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists ai_messages_insert_own on public.ai_messages;
create policy ai_messages_insert_own on public.ai_messages
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.app_settings s
      where s.user_id = (select auth.uid()) and s.ai_history_enabled = true
    )
  );
drop policy if exists ai_messages_delete_own on public.ai_messages;
create policy ai_messages_delete_own on public.ai_messages
  for delete to authenticated using ((select auth.uid()) = user_id);
