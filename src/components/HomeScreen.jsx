import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRoom, getRoom } from '../lib/api'
import { normalizeCode, randomCode } from '../lib/utils'

const inputCls =
  'w-full h-12 rounded-2xl bg-slate-50 ring-1 ring-slate-200 px-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 text-center font-bold tracking-wider'

/**
 * صفحه خانه: ساخت اتاق جدید (ادمین) یا ورود به اتاق موجود با کد (بیننده)
 */
export default function HomeScreen() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-6">
      <header className="text-center animate-pop">
        <div className="text-6xl mb-2">🃏</div>
        <h1 className="text-3xl font-black text-slate-800">جدول امتیاز حکم</h1>
        <p className="text-slate-500 mt-1">دیگه لازم نیست روی کاغذ بنویسید — همه از هر جا می‌بینند</p>
      </header>

      <CreateRoomCard onCreated={(code) => navigate(`/room/${code}`)} />
      <JoinRoomCard onJoined={(code) => navigate(`/room/${code}`)} />

      <footer className="text-center pb-4 space-y-1.5">
        <p className="text-teal-600 font-bold text-sm">طراحی شده توسط مهندس محمد فتحی</p>
        <p className="text-xs text-slate-400">برای نصب روی گوشی، این صفحه را به صفحه اصلی (Add to Home Screen) اضافه کنید</p>
      </footer>
    </div>
  )
}

/** کارت ساخت اتاق جدید */
function CreateRoomCard({ onCreated }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState(randomCode())
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    let finalCode = normalizeCode(code)
    if (finalCode.length !== 6) return setError('کد اتاق باید ۶ کاراکتر باشد')
    if (password.length < 4) return setError('رمز ادمین باید حداقل ۴ کاراکتر باشد')

    setBusy(true)
    try {
      try {
        await createRoom(finalCode, name.trim(), password)
      } catch (err) {
        // اگر کد از پیش گرفته شده بود، یک کد جدید تصادفی می‌سازیم و دوباره تلاش می‌کنیم
        if (/قبلاً|duplicate|unique/i.test(err.message)) {
          finalCode = randomCode()
          setCode(finalCode)
          await createRoom(finalCode, name.trim(), password)
        } else {
          throw err
        }
      }

      // ذخیره رمز ادمین روی همین دستگاه تا کاربر خودش ادمین اتاق باشد
      localStorage.setItem(`hokm-admin-${finalCode}`, password)
      onCreated(finalCode)
    } catch (err) {
      setError(err.message || 'خطا در ساخت اتاق')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm bg-white rounded-3xl shadow-lg ring-1 ring-black/5 p-5 space-y-3 animate-pop"
    >
      <h2 className="font-black text-slate-800 text-lg">ساخت اتاق جدید بازی</h2>
      <p className="text-xs text-slate-500 -mt-2">شما ادمین (ثبت‌کننده امتیاز) می‌شوید</p>

      <input
        className={inputCls}
        placeholder="نام اتاق (مثلاً دورهمی خانوادگی)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={30}
      />

      <div className="flex gap-2" dir="ltr">
        <input
          className={inputCls + ' flex-1'}
          placeholder="کد اتاق"
          value={code}
          onChange={(e) => setCode(normalizeCode(e.target.value))}
          maxLength={6}
        />
        <button
          type="button"
          onClick={() => setCode(randomCode())}
          className="h-12 px-3 rounded-2xl bg-slate-100 text-slate-600 font-bold active:bg-slate-200"
          title="کد جدید"
        >
          🎲
        </button>
      </div>

      <input
        className={inputCls}
        type="password"
        placeholder="رمز ادمین (برای ثبت امتیاز)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
      />

      {error && <p className="text-rose-600 text-sm font-bold text-center">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full py-3.5 rounded-2xl bg-teal-600 text-white font-black text-lg shadow-lg shadow-teal-600/25 active:bg-teal-700 disabled:opacity-50"
      >
        {busy ? 'در حال ساخت…' : 'ساخت اتاق'}
      </button>
    </form>
  )
}

/** کارت ورود به اتاق موجود */
function JoinRoomCard({ onJoined }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    const finalCode = normalizeCode(code)
    if (finalCode.length !== 6) return setError('کد اتاق ۶ کاراکتر است')

    setBusy(true)
    try {
      const room = await getRoom(finalCode)
      if (!room) return setError('اتاقی با این کد پیدا نشد')
      onJoined(finalCode)
    } catch (err) {
      setError(err.message || 'خطا در ورود به اتاق')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm bg-white rounded-3xl shadow-lg ring-1 ring-black/5 p-5 space-y-3 animate-pop"
    >
      <h2 className="font-black text-slate-800 text-lg">ورود به اتاق بازی</h2>
      <p className="text-xs text-slate-500 -mt-2">با کد اتاق، جدول را زنده تماشا کنید</p>

      <input
        className={inputCls}
        placeholder="کد اتاق"
        value={code}
        onChange={(e) => setCode(normalizeCode(e.target.value))}
        maxLength={6}
        dir="ltr"
      />

      {error && <p className="text-rose-600 text-sm font-bold text-center">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full py-3.5 rounded-2xl bg-slate-800 text-white font-black text-lg shadow-lg shadow-slate-800/20 active:bg-slate-900 disabled:opacity-50"
      >
        {busy ? 'در حال ورود…' : 'ورود'}
      </button>
    </form>
  )
}
