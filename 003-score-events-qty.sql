-- ============================================================
-- مهاجرت ۰۳ — ستون «مقدار» (qty) برای رویدادهای امتیاز
-- هدف: امکان کم/زیاد کردن هر شمارنده (ثبت +۱ یا −۱ به عنوان
--       یک رویدادِ ثبت‌شده در لاگ، تا همه ببینند چه تغییری کِی شد)
-- اجرا: این فایل را یک‌جا در SQL Editor سوپابیس اجرا کنید.
-- ============================================================

-- ۱) افزودن ستون مقدار (رویدادهای قدیمی عدد ۱ می‌گیرند ⇒ رفتار قبلی حفظ می‌شود)
alter table public.score_events
  add column if not exists qty integer not null default 1;

-- ۲) حذف نسخه قدیمی تابع (با امضای ۵ پارامتری) تا با نسخه جدید
--    تداخل (ambiguity) ایجاد نشود
drop function if exists public.add_score_event(text, text, uuid, uuid, text);

-- ۳) ساخت نسخه جدید با پشتیبانی از مقدار مثبت/منفی
create or replace function public.add_score_event(
  p_code text, p_password text, p_session uuid, p_player uuid,
  p_type text, p_qty integer default 1
)
returns public.score_events
language plpgsql
security definer
set search_path to public, extensions
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  v_current integer;
  v_event public.score_events;
begin
  if not public.verify_admin(v_code, p_password) then
    raise exception 'رمز ادمین اشتباه است';
  end if;
  if p_type not in ('win','loss','hakem_beat','hakem_beaten','mars_done','mars_received') then
    raise exception 'نوع امتیاز نامعتبر است';
  end if;
  if p_qty is null or p_qty = 0 or abs(p_qty) > 50 then
    raise exception 'مقدار امتیاز نامعتبر است';
  end if;
  if not exists (
    select 1 from public.game_sessions
    where id = p_session and room_code = v_code and is_active
  ) then
    raise exception 'این دور بسته شده است';
  end if;

  -- جلوگیری از منفی شدن شمارنده (وقتی چیزی ثبت نشده و می‌خواهید کمش کنید)
  if p_qty < 0 then
    select coalesce(sum(qty), 0) into v_current
    from public.score_events
    where session_id = p_session and player_id = p_player and event_type = p_type;

    if v_current + p_qty < 0 then
      raise exception 'این مورد قبلاً صفر است و کمتر نمی‌شود';
    end if;
  end if;

  insert into public.score_events (room_code, session_id, player_id, event_type, qty)
  values (v_code, p_session, p_player, p_type, p_qty)
  returning * into v_event;

  return v_event;
end;
$$;

-- ۴) دسترسی اجرا برای نقش‌های Supabase (با امضای جدید)
grant execute on function public.add_score_event(text, text, uuid, uuid, text, integer)
  to anon, authenticated;

-- پایان مهاجرت ۰۳
