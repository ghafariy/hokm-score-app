import { supabase } from './supabase'

/**
 * لایه دسترسی به دیتابیس.
 * نکته امنیتی: هیچ عملیات نوشتنی مستقیم نیست؛ همه از طریق توابع SQL
 * (security definer) انجام می‌شود که رمز ادمین را سمت سرور بررسی می‌کنند.
 */

function throwIf(error) {
  if (error) throw new Error(error.message || 'خطای ناشناخته در ارتباط با سرور')
}

async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args)
  throwIf(error)
  return data
}

/** گرفتن اطلاعات اتاق (نام و تاریخ ساخت) — اگر نبود null برمی‌گرداند */
export async function getRoom(code) {
  const { data, error } = await supabase.rpc('get_room', { p_code: code })
  throwIf(error)
  return data?.[0] ?? null
}

/** ساخت اتاق جدید با رمز ادمین */
export async function createRoom(code, name, password) {
  return rpc('create_room', { p_code: code, p_name: name, p_password: password })
}

/** بررسی رمز ادمین (true/false) */
export async function verifyAdmin(code, password) {
  const { data, error } = await supabase.rpc('verify_admin', { p_code: code, p_password: password })
  throwIf(error)
  return Boolean(data)
}

/** ثبت یک رویداد امتیاز (نیازمند رمز ادمین) */
export async function addScoreEvent(code, password, sessionId, playerId, type) {
  return rpc('add_score_event', {
    p_code: code, p_password: password, p_session: sessionId, p_player: playerId, p_type: type,
  })
}

/** بازگرداندن (Undo) آخرین رویداد ثبت‌شده در یک دور */
export async function undoLastEvent(code, password, sessionId) {
  return rpc('undo_last_event', { p_code: code, p_password: password, p_session: sessionId })
}

/** افزودن بازیکن جدید */
export async function addPlayer(code, password, name) {
  return rpc('add_player', { p_code: code, p_password: password, p_name: name })
}

/** حذف بازیکن (امتیازات او هم پاک می‌شود) */
export async function removePlayer(code, password, playerId) {
  return rpc('remove_player', { p_code: code, p_password: password, p_player: playerId })
}

/** شروع دور (شب) جدید — دور قبلی بسته و به آرشیو می‌رود */
export async function createSession(code, password, title, date) {
  return rpc('create_session', { p_code: code, p_password: password, p_title: title, p_date: date })
}

/** پاک کردن همه امتیازات یک دور */
export async function clearSession(code, password, sessionId) {
  return rpc('clear_session', { p_code: code, p_password: password, p_session: sessionId })
}

/** حذف کامل یک دور از آرشیو */
export async function deleteSession(code, password, sessionId) {
  return rpc('delete_session', { p_code: code, p_password: password, p_session: sessionId })
}

/** تغییر رمز ادمین (با تایید رمز فعلی) */
export async function changeAdminPassword(code, currentPassword, newPassword) {
  return rpc('change_admin_password', { p_code: code, p_password: currentPassword, p_new_password: newPassword })
}

/** دریافت همه داده‌های یک اتاق در یک فراخوانی */
export async function fetchRoomBundle(code) {
  const [room, playersRes, sessionsRes, eventsRes] = await Promise.all([
    getRoom(code),
    supabase.from('players').select('*').eq('room_code', code).order('sort_order', { ascending: true }),
    supabase.from('game_sessions').select('*').eq('room_code', code).order('created_at', { ascending: false }),
    supabase.from('score_events').select('*').eq('room_code', code).order('created_at', { ascending: true }),
  ])
  throwIf(playersRes.error)
  throwIf(sessionsRes.error)
  throwIf(eventsRes.error)
  return {
    room,
    players: playersRes.data ?? [],
    sessions: sessionsRes.data ?? [],
    events: eventsRes.data ?? [],
  }
}
