import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchRoomBundle } from '../lib/api'

/**
 * هوک اصلی اتاق: دریافت داده‌ها + همگام‌سازی لحظه‌ای (Live Sync)
 * با Supabase Realtime و یک پالینگ پشتیبان برای اطمینان.
 */
export function useRoom(code) {
  const [state, setState] = useState({
    room: null,
    players: [],
    sessions: [],
    events: [],
    loading: true,
    error: null,
  })
  const [live, setLive] = useState('CLOSED') // وضعیت اتصال کانال Realtime
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const timerRef = useRef(null)
  const fetchIdRef = useRef(0)

  const reload = useCallback(async () => {
    const fetchId = ++fetchIdRef.current
    try {
      const bundle = await fetchRoomBundle(code)
      if (fetchId !== fetchIdRef.current) return // پاسخ‌های قدیمی‌تر نادیده گرفته شوند
      if (!bundle.room) {
        setState({ ...bundle, loading: false, error: 'اتاق پیدا نشد. کد اتاق را دوباره بررسی کنید.' })
        return
      }
      setState({ ...bundle, loading: false, error: null })
    } catch (e) {
      if (fetchId !== fetchIdRef.current) return
      setState((s) => ({ ...s, loading: false, error: e.message || 'خطا در دریافت اطلاعات اتاق' }))
    }
  }, [code])

  // همگام‌سازی با تاخیر کوتاه تا چند تپ پشت سر هم چند درخواست موازی نسازد
  const reloadDebounced = useCallback(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(reload, 200)
  }, [reload])

  useEffect(() => {
    reload()

    // رویدادهای آنلاین/آفلاین مرورگر
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    // اشتراک لحظه‌ای روی جداول اتاق
    let channel = null
    if (supabase) {
      channel = supabase
        .channel(`room-${code}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_code=eq.${code}` }, reloadDebounced)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'game_sessions', filter: `room_code=eq.${code}` }, reloadDebounced)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'score_events', filter: `room_code=eq.${code}` }, reloadDebounced)
        .subscribe((status) => setLive(status))
    }

    // پالینگ پشتیبان هر ۲۵ ثانیه (جلوگیری از جاماندن به‌ندرت رویدادها)
    const poll = setInterval(reloadDebounced, 25000)

    return () => {
      clearTimeout(timerRef.current)
      clearInterval(poll)
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      if (channel) supabase.removeChannel(channel)
    }
  }, [code, reload, reloadDebounced])

  return { ...state, reload, live, online, connected: online && live === 'SUBSCRIBED' }
}
