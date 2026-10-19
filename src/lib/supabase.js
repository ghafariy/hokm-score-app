import { createClient } from '@supabase/supabase-js'

// تنظیمات از فایل .env خوانده می‌شود (مقادیر را از پنل Supabase بگیرید)
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

// کلاینت Supabase — اپ بدون آن کار نمی‌کند، ولی نباید کرش کند؛
// به جای آن صفحه «راه‌اندازی» نمایش داده می‌شود (ببین: SetupNotice)
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null
