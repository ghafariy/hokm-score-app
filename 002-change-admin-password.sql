-- ============================================================
-- مهاجرت ۰۰۲: تابع تغییر رمز ادمین
-- این فایل را در SQL Editor پروژه Supabase اجرا کنید
-- (برای پروژه‌هایی که اسکیمای اولیه را قبلاً اجرا کرده‌اند)
-- ============================================================

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
  -- ابتدا رمز فعلی بررسی می‌شود
  if not public.verify_admin(v_code, p_password) then
    raise exception 'رمز ادمین فعلی اشتباه است';
  end if;
  -- قواعد رمز جدید
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

grant execute on function public.change_admin_password(text, text, text) to anon, authenticated;

-- پایان
