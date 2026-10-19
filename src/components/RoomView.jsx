import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useRoom } from '../hooks/useRoom'
import { useAdmin } from '../hooks/useAdmin'
import {
  addPlayer,
  addScoreEvent,
  clearSession,
  createSession,
  deleteSession,
  removePlayer,
  undoLastEvent,
} from '../lib/api'
import { jalaliShortDate, localISODate } from '../lib/utils'
import Scoreboard from './Scoreboard.jsx'
import Leaderboard, { buildRows } from './Leaderboard.jsx'
import HistoryView from './HistoryView.jsx'
import Modal, { ConfirmModal } from './Modal.jsx'
import Toast from './Toast.jsx'

const TABS = [
  { id: 'score', label: 'امتیازات', icon: '🎯' },
  { id: 'table', label: 'جدول کامل', icon: '📋' },
  { id: 'history', label: 'تاریخچه', icon: '🗂️' },
]

/**
 * نمای اصلی اتاق: هدر + تب‌ها + کنترل‌های ادمین + نمایش زنده امتیازات
 */
export default function RoomView() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { room, players, sessions, events, loading, error, reload, connected, online } = useRoom(code)
  const admin = useAdmin(code)

  const [tab, setTab] = useState('score')
  const [toast, setToast] = useState(null)
  const [modal, setModal] = useState(null) // نام مودال باز: password | players | newSession
  const [confirm, setConfirm] = useState(null) // { title, message, danger, onConfirm }

  // افکت نمایش توست با مدت زمان حذف خودکار
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(t)
  }, [toast])

  const showToast = useCallback((msg, kind = 'success') => {
    setToast({ msg, kind, id: Date.now() })
  }, [])

  const activeSession = useMemo(() => sessions.find((s) => s.is_active) ?? null, [sessions])
  const activeEvents = useMemo(
    () => (activeSession ? events.filter((e) => e.session_id === activeSession.id) : []),
    [events, activeSession],
  )

  // تابع کمکی اجرای عملیات ادمین با مدیریت خطای رمز
  const guarded = useCallback(
    async (fn, successMsg) => {
      try {
        const result = await fn()
        if (successMsg) showToast(successMsg)
        return result
      } catch (err) {
        const msg = String(err.message || '')
        if (msg.includes('رمز ادمین')) {
          admin.invalidate()
          setModal('password')
          showToast('برای ادامه رمز ادمین را وارد کنید', 'error')
        } else {
          showToast(msg || 'خطا در انجام عملیات', 'error')
        }
        return null
      }
    },
    [admin, showToast],
  )

  // ---------- عملیات امتیازدهی ----------
  const handleScore = useCallback(
    (playerId, type) => {
      if (!admin.isAdmin) {
        setModal('password')
        return
      }
      if (!activeSession) {
        showToast('ابتدا یک دور جدید بسازید', 'error')
        return
      }
      guarded(() => addScoreEvent(code, admin.password, activeSession.id, playerId, type))
    },
    [admin, activeSession, code, guarded, showToast],
  )

  const handleUndo = useCallback(() => {
    if (!admin.isAdmin) return setModal('password')
    if (!activeSession) return showToast('دوری برای بازگشت وجود ندارد', 'error')
    guarded(async () => {
      const ok = await undoLastEvent(code, admin.password, activeSession.id)
      showToast(ok ? 'آخرین امتیاز برگشت خورد' : 'چیزی برای برگشت زدن نیست')
    })
  }, [admin, activeSession, code, guarded, showToast])

  // ---------- عملیات مدیریتی ----------
  const handleAddPlayer = useCallback(
    async (name) => {
      const ok = await guarded(() => addPlayer(code, admin.password, name), `بازیکن «${name}» اضافه شد`)
      if (ok) setModal(null)
    },
    [admin, code, guarded],
  )

  const handleRemovePlayer = useCallback(
    (player) => {
      setConfirm({
        title: 'حذف بازیکن',
        message: `با حذف «${player.name}» همه امتیازات او نیز پاک می‌شود. مطمئنید؟`,
        danger: true,
        confirmLabel: 'حذف',
        onConfirm: async () => {
          setConfirm(null)
          await guarded(() => removePlayer(code, admin.password, player.id), `«${player.name}» حذف شد`)
        },
      })
    },
    [admin, code, guarded],
  )

  const handleNewSession = useCallback(
    async (title) => {
      const ok = await guarded(
        () => createSession(code, admin.password, title, localISODate()),
        'دور جدید شروع شد 🎉',
      )
      if (ok) {
        setModal(null)
        setTab('score')
      }
    },
    [admin, code, guarded],
  )

  const handleClearSession = useCallback(
    (session) => {
      setConfirm({
        title: 'پاک کردن امتیازات دور',
        message: `امتیازات دور «${session.title}» کامل پاک می‌شود. ادامه می‌دهید؟`,
        danger: true,
        confirmLabel: 'پاک کردن',
        onConfirm: async () => {
          setConfirm(null)
          await guarded(() => clearSession(code, admin.password, session.id), 'امتیازات دور پاک شد')
        },
      })
    },
    [admin, code, guarded],
  )

  const handleDeleteSession = useCallback(
    (session) => {
      setConfirm({
        title: 'حذف دور از آرشیو',
        message: `دور «${session.title}» و همه امتیازاتش برای همیشه حذف می‌شود. ادامه می‌دهید؟`,
        danger: true,
        confirmLabel: 'حذف کامل',
        onConfirm: async () => {
          setConfirm(null)
          await guarded(() => deleteSession(code, admin.password, session.id), 'دور حذف شد')
        },
      })
    },
    [admin, code, guarded],
  )

  // ---------- حالت‌های بارگذاری و خطا ----------
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center">
          <div className="text-5xl mb-3 animate-pulse">🃏</div>
          <p className="text-slate-500 font-bold">در حال باز کردن اتاق…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="text-center bg-white rounded-3xl shadow-xl ring-1 ring-black/5 p-8 max-w-sm w-full">
          <div className="text-5xl mb-3">😕</div>
          <h2 className="font-black text-slate-800 text-xl mb-2">اتاق باز نشد</h2>
          <p className="text-slate-500 mb-6 leading-7">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 rounded-2xl bg-teal-600 text-white font-black active:bg-teal-700"
          >
            بازگشت به صفحه اصلی
          </button>
        </div>
      </div>
    )
  }

  const rowsActive = buildRows(players, activeEvents)

  return (
    <div className="min-h-screen pb-10">
      {/* هدر */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-slate-200/70">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-slate-800 text-lg truncate flex items-center gap-2">
              {room?.name}
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  connected ? 'bg-emerald-100 text-emerald-700' : online ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                }`}
              >
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full me-1 ${connected ? 'bg-emerald-500 animate-pulse-dot' : online ? 'bg-amber-500' : 'bg-rose-500'}`}
                />
                {connected ? 'زنده' : online ? 'در حال اتصال' : 'آفلاین'}
              </span>
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span>کد: {code}</span>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(code)
                  showToast('کد اتاق کپی شد')
                }}
                className="text-teal-600 font-bold"
              >
                کپی
              </button>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {admin.isAdmin ? (
              <span className="text-[11px] font-black bg-teal-600 text-white rounded-full px-3 py-1.5">ادمین</span>
            ) : (
              <button
                onClick={() => setModal('password')}
                className="text-[11px] font-bold bg-slate-100 text-slate-600 rounded-full px-3 py-1.5 active:bg-slate-200"
              >
                ورود ادمین
              </button>
            )}
            <button
              onClick={() => navigate('/')}
              className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 grid place-items-center active:bg-slate-200"
              title="خروج از اتاق"
            >
              🚪
            </button>
          </div>
        </div>

        {/* تب‌ها */}
        <div className="max-w-3xl mx-auto px-4 pb-2 flex gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 h-10 rounded-2xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors ${
                tab === t.id ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* نوار عملیات ادمین */}
        {admin.isAdmin && (
          <div className="max-w-3xl mx-auto px-4 pb-2 flex gap-1.5 overflow-x-auto">
            <AdminChip label="↶ بازگشت آخرین" onClick={handleUndo} tone="amber" />
            <AdminChip label="＋ افزودن بازیکن" onClick={() => setModal('players')} tone="slate" />
            <AdminChip label="↻ دور جدید" onClick={() => setModal('newSession')} tone="slate" />
          </div>
        )}
      </header>

      {/* بدنه */}
      <main className="max-w-3xl mx-auto px-4 pt-4">
        {tab === 'score' && (
          <Scoreboard
            players={players}
            events={activeEvents}
            isAdmin={admin.isAdmin}
            onScore={handleScore}
            onLockedTap={() => setModal('password')}
          />
        )}

        {tab === 'table' && (
          <Leaderboard
            rows={rowsActive}
            sessionLabel={activeSession ? `${activeSession.title} — ${jalaliShortDate(activeSession.session_date)}` : 'دوری فعال نیست'}
            sessionDate={activeSession?.session_date}
          />
        )}

        {tab === 'history' && (
          <HistoryView
            players={players}
            sessions={sessions}
            events={events}
            activeSession={activeSession}
            isAdmin={admin.isAdmin}
            onDeleteSession={handleDeleteSession}
            onClearSession={handleClearSession}
          />
        )}
      </main>

      {/* ---------- مودال‌ها ---------- */}
      <PasswordModal
        open={modal === 'password'}
        onClose={() => setModal(null)}
        onSubmit={async (pw) => {
          try {
            await admin.login(pw)
            setModal(null)
            showToast('خوش آمدید، حالا می‌توانید امتیاز ثبت کنید')
          } catch {
            showToast('رمز ادمین اشتباه است', 'error')
          }
        }}
        checking={admin.checking}
      />

      <PlayersModal
        open={modal === 'players'}
        onClose={() => setModal(null)}
        players={players}
        onAdd={handleAddPlayer}
        onRemove={handleRemovePlayer}
      />

      <NewSessionModal
        open={modal === 'newSession'}
        onClose={() => setModal(null)}
        onSubmit={handleNewSession}
        activeSession={activeSession}
      />

      <ConfirmModal
        open={Boolean(confirm)}
        title={confirm?.title}
        message={confirm?.message}
        danger={confirm?.danger}
        confirmLabel={confirm?.confirmLabel}
        onConfirm={confirm?.onConfirm}
        onClose={() => setConfirm(null)}
      />

      <Toast toast={toast} />
    </div>
  )
}

/** چیپ کوچک عملیات ادمین */
function AdminChip({ label, onClick, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 active:bg-slate-200',
    amber: 'bg-amber-100 text-amber-800 active:bg-amber-200',
  }
  return (
    <button
      onClick={onClick}
      className={`shrink-0 h-9 px-3.5 rounded-2xl text-xs font-black ${tones[tone]} whitespace-nowrap`}
    >
      {label}
    </button>
  )
}

/** مودال ورود ادمین */
function PasswordModal({ open, onClose, onSubmit, checking }) {
  const [pw, setPw] = useState('')
  useEffect(() => {
    if (open) setPw('')
  }, [open])

  return (
    <Modal open={open} title="ورود ادمین" onClose={onClose}>
      <p className="text-slate-500 text-sm leading-7 mb-4">
        برای ثبت یا ویرایش امتیاز، رمز ادمین اتاق را وارد کنید. (فقط لازم است یک بار وارد شوید)
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (pw) onSubmit(pw)
        }}
        className="space-y-3"
      >
        <input
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="رمز ادمین"
          className="w-full h-12 rounded-2xl bg-slate-50 ring-1 ring-slate-200 px-4 text-center font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button
          type="submit"
          disabled={checking || !pw}
          className="w-full h-12 rounded-2xl bg-teal-600 text-white font-black active:bg-teal-700 disabled:opacity-50"
        >
          {checking ? 'در حال بررسی…' : 'ورود'}
        </button>
      </form>
    </Modal>
  )
}

/** مودال مدیریت بازیکنان */
function PlayersModal({ open, onClose, players, onAdd, onRemove }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (open) setName('')
  }, [open])

  return (
    <Modal open={open} title="بازیکنان" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          const n = name.trim()
          if (!n) return
          setBusy(true)
          await onAdd(n)
          setBusy(false)
        }}
        className="flex gap-2 mb-4"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="نام بازیکن جدید"
          maxLength={30}
          className="flex-1 h-12 rounded-2xl bg-slate-50 ring-1 ring-slate-200 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="h-12 px-5 rounded-2xl bg-teal-600 text-white font-black active:bg-teal-700 disabled:opacity-50"
        >
          افزودن
        </button>
      </form>

      {players.length === 0 ? (
        <p className="text-slate-400 text-center py-6 font-bold">هنوز بازیکنی نیست</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {players.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2.5">
              <span className="font-bold text-slate-700">{p.name}</span>
              <button
                onClick={() => onRemove(p)}
                className="text-xs font-bold text-rose-600 bg-rose-50 rounded-xl px-3 py-1.5 active:bg-rose-100"
              >
                حذف
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}

/** مودال شروع دور جدید */
function NewSessionModal({ open, onClose, onSubmit, activeSession }) {
  const [title, setTitle] = useState('')
  useEffect(() => {
    if (open) setTitle(jalaliShortDate(new Date()))
  }, [open])

  return (
    <Modal open={open} title="شروع دور (شب) جدید" onClose={onClose}>
      <p className="text-slate-500 text-sm leading-7 mb-4">
        با شروع دور جدید، جدول فعلی بسته و در آرشیو ذخیره می‌شود و صفر آغاز می‌شود.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit(title.trim() || jalaliShortDate(new Date()))
        }}
        className="space-y-3"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان دور (مثلاً تاریخ امروز)"
          maxLength={30}
          className="w-full h-12 rounded-2xl bg-slate-50 ring-1 ring-slate-200 px-4 text-center font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button
          type="submit"
          className="w-full h-12 rounded-2xl bg-teal-600 text-white font-black active:bg-teal-700"
        >
          شروع دور جدید
        </button>
      </form>
    </Modal>
  )
}
