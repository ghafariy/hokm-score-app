import { useCallback, useState } from 'react'
import { verifyAdmin } from '../lib/api'

const storageKey = (code) => `hokm-admin-${code}`

/**
 * هوک وضعیت ادمین: رمز ادمین فقط روی دستگاه خود ادمین نگه داشته می‌شود
 * و برای هر عملیات نوشتنی، سرور دوباره آن را بررسی می‌کند.
 */
export function useAdmin(code) {
  const [password, setPassword] = useState(() => {
    try {
      return localStorage.getItem(storageKey(code))
    } catch {
      return null
    }
  })
  const [checking, setChecking] = useState(false)

  const isAdmin = Boolean(password)

  /** ورود ادمین با رمز — رمز سمت سرور تایید می‌شود */
  const login = useCallback(
    async (pw) => {
      setChecking(true)
      try {
        const ok = await verifyAdmin(code, pw)
        if (!ok) throw new Error('رمز ادمین اشتباه است')
        localStorage.setItem(storageKey(code), pw)
        setPassword(pw)
        return true
      } finally {
        setChecking(false)
      }
    },
    [code],
  )

  /** پاک کردن رمز ذخیره‌شده (وقتی سرور رمز را رد کرد) */
  const invalidate = useCallback(() => {
    localStorage.removeItem(storageKey(code))
    setPassword(null)
  }, [code])

  /** خروج داوطلبانه از حالت ادمین (برای پیش‌نمایش حالت مهمان) */
  const logout = useCallback(() => {
    localStorage.removeItem(storageKey(code))
    setPassword(null)
  }, [code])

  /** ذخیره رمز جدید پس از تغییر موفق */
  const persistPassword = useCallback(
    (pw) => {
      if (pw) {
        localStorage.setItem(storageKey(code), pw)
        setPassword(pw)
      } else {
        localStorage.removeItem(storageKey(code))
        setPassword(null)
      }
    },
    [code],
  )

  return { isAdmin, password, login, invalidate, logout, persistPassword, checking }
}
