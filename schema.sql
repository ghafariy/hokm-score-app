-- ============================================================
-- اسکیمای دیتابیس وب‌اپ «جدول امتیاز حکم» (Supabase / PostgreSQL)
-- این فایل را یکجا در SQL Editor پروژه Supabase اجرا کنید.
-- ============================================================

-- ۱) افزونه هش رمز عبور (bcrypt)
create extension if not exists pgcrypto;

-- ۲) جداول
create table if not exists public.rooms (
  code text primary key,
  name text not null default 'اتاق حکم',
  admin_password_hash text not null,
  created_at timestamptz not null default now(),
  constraint rooms_code_format check (code ~ '^[A-Z0-9]{6}$')
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.rooms(code) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists players_room_idx on public.players(room_code, sort_order);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.rooms(code) on delete cascade,
  title text not null check (char_length(title) between 1 and 40),
  session_date date not null default current_date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists sessions_room_idx on public.game_sessions(room_code, created_at desc);

-- فقط یک دور فعال برای هر اتاق
create unique index if not exists one_active_session_per_room
  on public.game_sessions(room_code) where is_active;

create table if not exists public.score_events (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.rooms(code) on delete cascade,
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  event_type text not null check (event_type in (
    'win','loss','hakem_beat','hakem_beaten','mars_done','mars_received'
  )),
  created_at timestamptz not null default now()
);
create index if not exists events_lookup_idx
  on public.score_events(room_code, session_id, created_at);

-- اطمینان از دریافت کامل رویدادهای حذف/ویرایش در Realtime
alter table public.players replica identity full;
alter table public.game_sessions replica identity full;
alter table public.score_events replica identity full;

-- ۳) امنیت (RLS)
alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.game_sessions enable row level security;
alter table public.score_events enable row level security;

-- خواندن آزاد برای داده‌های امتیاز (نام بازیکن و امتیازها حساس نیستند)
create policy "players_read" on public.players for select using (true);
create policy "sessions_read" on public.game_sessions for select using (true);
create policy "events_read" on public.score_events for select using (true);

-- جدول rooms هیچ دسترسی خواندن مستقیم ندارد (چون شامل هش رمز است)
-- و از طریق تابع get_room اطلاعات عمومی اتاق برگردانده می‌شود.
-- هیچ policy نوشتنی برای anon وجود ندارد → همه نوشتن‌ها از طریق توابع امن انجام می‌شود.

-- ۴) توابع امن (security definer) — همه عملیات نوشتن از اینجا انجام می‌شود

-- دریافت اطلاعات عمومی اتاق (بدون نمایش رمز)
create or replace function public.get_room(p_code text)
returns table (code text, name text, created_at timestamptz)
language sql
security definer
set search_path to public, extensions
as $$
  select r.code, r.name, r.created_at
  from public.rooms r
  where r.code = upper(trim(coalesce(p_code, '')))
  limit 1;
$$;

-- ساخت اتاق جدید + اولین دور بازی
create or replace function public.create_room(p_code text, p_name text, p_password text)
returns public.rooms
language plpgsql
security definer
set search_path to public, extensions
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  v_name text := trim(coalesce(p_name, ''));
  v_room public.rooms;
begin
  if v_code !~ '^[A-Z0-9]{6}$' then
    raise exception 'کد اتاق باید ۶ کاراکتر (حرف یا عدد) باشد';
  end if;
  if length(coalesce(p_password, '')) < 4 then
    raise exception 'رمز ادمین باید حداقل ۴ کاراکتر باشد';
  end if;
  if length(coalesce(p_password, '')) > 64 then
    raise exception 'رمز ادمین خیلی بلند است';
  end if;

  begin
    insert into public.rooms (code, name, admin_password_hash)
    values (
      v_code,
      case when v_name = '' then 'اتاق حکم' else v_name end,
      crypt(p_password, gen_salt('bf', 10))
    )
    returning * into v_room;
  exception when unique_violation then
    raise exception 'این کد اتاق قبلاً گرفته شده است';
  end;

  -- ساخت اولین دور بازی (فعال)
  insert into public.game_sessions (room_code, title, session_date, is_active)
  values (v_room.code, 'بازی امروز', current_date, true);

  return v_room;
end;
$$;

-- بررسی رمز ادمین
create or replace function public.verify_admin(p_code text, p_password text)
returns boolean
language sql
security definer
set search_path to public, extensions
as $$
  select exists (
    select 1
    from public.rooms r
    where r.code = upper(trim(coalesce(p_code, '')))
      and r.admin_password_hash = crypt(coalesce(p_password, ''), r.admin_password_hash)
  );
$$;

-- ثبت یک رویداد امتیاز
create or replace function public.add_score_event(
  p_code text, p_password text, p_session uuid, p_player uuid, p_type text
)
returns public.score_events
language plpgsql
security definer
set search_path to public, extensions
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  v_event public.score_events;
begin
  if not public.verify_admin(v_code, p_password) then
    raise exception 'رمز ادمین اشتباه است';
  end if;
  if p_type not in ('win','loss','hakem_beat','hakem_beaten','mars_done','mars_received') then
    raise exception 'نوع امتیاز نامعتبر است';
  end if;
  if not exists (
    select 1 from public.game_sessions
    where id = p_session and room_code = v_code and is_active
  ) then
    raise exception 'این دور بسته شده است';
  end if;

  insert into public.score_events (room_code, session_id, player_id, event_type)
  values (v_code, p_session, p_player, p_type)
  returning * into v_event;

  return v_event;
end;
$$;

-- بازگرداندن (Undo) آخرین رویداد دور
create or replace function public.undo_last_event(p_code text, p_password text, p_session uuid)
returns boolean
language plpgsql
security definer
set search_path to public, extensions
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  v_id uuid;
begin
  if not public.verify_admin(v_code, p_password) then
    raise exception 'رمز ادمین اشتباه است';
  end if;

  select id into v_id
  from public.score_events
  where room_code = v_code and session_id = p_session
  order by created_at desc, id desc
  limit 1;

  if v_id is null then
    return false;
  end if;

  delete from public.score_events where id = v_id;
  return true;
end;
$$;

-- افزودن بازیکن جدید
create or replace function public.add_player(p_code text, p_password text, p_name text)
returns public.players
language plpgsql
security definer
set search_path to public, extensions
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  v_name text := trim(coalesce(p_name, ''));
  v_player public.players;
begin
  if not public.verify_admin(v_code, p_password) then
    raise exception 'رمز ادمین اشتباه است';
  end if;
  if length(v_name) < 1 or length(v_name) > 40 then
    raise exception 'نام بازیکن باید ۱ تا ۴۰ کاراکتر باشد';
  end if;

  insert into public.players (room_code, name, sort_order)
  values (
    v_code,
    v_name,
    (select coalesce(max(sort_order), 0) + 1 from public.players where room_code = v_code)
  )
  returning * into v_player;

  return v_player;
end;
$$;

-- حذف بازیکن (امتیازات او با cascade پاک می‌شود)
create or replace function public.remove_player(p_code text, p_password text, p_player uuid)
returns void
language plpgsql
security definer
set search_path to public, extensions
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
begin
  if not public.verify_admin(v_code, p_password) then
    raise exception 'رمز ادمین اشتباه است';
  end if;

  delete from public.players where id = p_player and room_code = v_code;
end;
$$;

-- شروع دور (شب) جدید — دور قبلی بسته می‌شود
create or replace function public.create_session(
  p_code text, p_password text, p_title text, p_date date default current_date
)
returns public.game_sessions
language plpgsql
security definer
set search_path to public, extensions
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  v_title text := trim(coalesce(p_title, ''));
  v_session public.game_sessions;
begin
  if not public.verify_admin(v_code, p_password) then
    raise exception 'رمز ادمین اشتباه است';
  end if;
  if length(v_title) < 1 or length(v_title) > 40 then
    v_title := to_char(coalesce(p_date, current_date), 'YYYY-MM-DD');
  end if;

  update public.game_sessions set is_active = false
  where room_code = v_code and is_active;

  insert into public.game_sessions (room_code, title, session_date, is_active)
  values (v_code, v_title, coalesce(p_date, current_date), true)
  returning * into v_session;

  return v_session;
end;
$$;

-- پاک کردن همه امتیازات یک دور
create or replace function public.clear_session(p_code text, p_password text, p_session uuid)
returns void
language plpgsql
security definer
set search_path to public, extensions
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
begin
  if not public.verify_admin(v_code, p_password) then
    raise exception 'رمز ادمین اشتباه است';
  end if;

  delete from public.score_events where room_code = v_code and session_id = p_session;
end;
$$;

-- حذف کامل یک دور از آرشیو (فقط دورهای بسته)
create or replace function public.delete_session(p_code text, p_password text, p_session uuid)
returns void
language plpgsql
security definer
set search_path to public, extensions
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
begin
  if not public.verify_admin(v_code, p_password) then
    raise exception 'رمز ادمین اشتباه است';
  end if;

  delete from public.game_sessions
  where id = p_session and room_code = v_code and not is_active;
end;
$$;

-- تغییر رمز ادمین (با تایید رمز فعلی)
create or replace function public.change_admin_password(
  p_code text, p_password text, p_new_password text
)
returns boolean
language plpgsql
security definer
set search_path to public, extensions
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
begin
  if not public.verify_admin(v_code, p_password) then
    raise exception 'رمز ادمین فعلی اشتباه است';
  end if;
  if length(coalesce(p_new_password, '')) < 4 then
    raise exception 'رمز جدید باید حداقل ۴ کاراکتر باشد';
  end if;
  if length(coalesce(p_new_password, '')) > 64 then
    raise exception 'رمز جدید خیلی بلند است';
  end if;

  update public.rooms
  set admin_password_hash = crypt(p_new_password, gen_salt('bf', 10))
  where code = v_code;

  return true;
end;
$$;

-- ۵) دسترسی اجرا برای نقش‌های Supabase
grant usage on schema public to anon, authenticated;
grant execute on function public.get_room(text) to anon, authenticated;
grant execute on function public.create_room(text, text, text) to anon, authenticated;
grant execute on function public.verify_admin(text, text) to anon, authenticated;
grant execute on function public.add_score_event(text, text, uuid, uuid, text) to anon, authenticated;
grant execute on function public.undo_last_event(text, text, uuid) to anon, authenticated;
grant execute on function public.add_player(text, text, text) to anon, authenticated;
grant execute on function public.remove_player(text, text, uuid) to anon, authenticated;
grant execute on function public.create_session(text, text, text, date) to anon, authenticated;
grant execute on function public.clear_session(text, text, uuid) to anon, authenticated;
grant execute on function public.delete_session(text, text, uuid) to anon, authenticated;
grant execute on function public.change_admin_password(text, text, text) to anon, authenticated;

-- ۶) فعال‌سازی Realtime برای جداول (همگام‌سازی لحظه‌ای بین گوشی‌ها)
do $$
begin
  alter publication supabase_realtime add table public.players;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.game_sessions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.score_events;
exception when duplicate_object then null;
end $$;

-- پایان — همه چیز آماده است.
