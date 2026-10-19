import { useEffect, useRef, useState } from 'react'
import { EVENT_META, toFa, toFaSigned } from '../lib/utils'

/**
 * گروه‌های دکمه روی هر کارت بازیکن:
 * برد/باخت — حاکم‌کت — مارس
 */
const GROUPS = [
  { label: 'بردها', plus: 'win', minus: 'loss' },
  { label: 'حاکم‌کت', plus: 'hakem_beat', minus: 'hakem_beaten' },
  { label: 'مارس', plus: 'mars_done', minus: 'mars_received' },
]

const totalColor = (t) => (t > 0 ? 'bg-emerald-100 text-emerald-700' : t < 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600')

/**
 * کارت هر بازیکن: نام + امتیاز کل + دکمه‌های سریع ثبت امتیاز (فقط ادمین)
 */
export default function PlayerCard({ player, counts, total, isAdmin, onScore, onLockedTap }) {
  // انیمیشن تکان‌ خوردن عدد امتیاز هنگام تغییر
  const [bump, setBump] = useState(0)
  const prevTotal = useRef(total)
  useEffect(() => {
    if (prevTotal.current !== total) {
      prevTotal.current = total
      setBump((b) => b + 1)
    }
  }, [total])

  return (
    <div
      className={`bg-white rounded-3xl shadow-md ring-1 ring-black/5 p-4 ${!isAdmin ? 'cursor-pointer' : ''}`}
      onClick={!isAdmin ? onLockedTap : undefined}
    >
      {/* سربرگ: نام و امتیاز کل */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white grid place-items-center font-black text-lg shrink-0">
          {player.name.trim().charAt(0) || '؟'}
        </div>
        <h3 className="font-black text-slate-800 text-lg flex-1 truncate">{player.name}</h3>
        <div className={`rounded-2xl px-3 py-1.5 font-black text-xl ${totalColor(total)}`}>
          <span key={bump} className="animate-bump inline-block" dir="ltr">
            {toFaSigned(total)}
          </span>
        </div>
      </div>

      {/* دکمه‌های امتیازدهی */}
      <div className="space-y-2.5">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[11px] text-slate-400 font-bold mb-1">{group.label}</p>
            <div className="flex gap-2">
              <ScoreButton type={group.plus} count={counts[group.plus]} isAdmin={isAdmin} onScore={onScore} />
              <ScoreButton type={group.minus} count={counts[group.minus]} isAdmin={isAdmin} onScore={onScore} />
            </div>
          </div>
        ))}
      </div>

      {!isAdmin && (
        <p className="text-[11px] text-slate-400 text-center mt-3">فقط ادمین می‌تواند امتیاز ثبت کند — برای ورود ادمین تپ کنید</p>
      )}
    </div>
  )
}

/** یک دکمه امتیاز (سبز برای + و قرمز برای −) با نمایش تعداد فعلی */
function ScoreButton({ type, count, isAdmin, onScore }) {
  const meta = EVENT_META[type]
  const positive = meta.sign > 0
  const style = positive
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 active:bg-emerald-600 active:text-white'
    : 'bg-rose-50 text-rose-700 ring-rose-200 active:bg-rose-600 active:text-white'

  if (!isAdmin) {
    // حالت بیننده: بدون تعامل، فقط نمایش تعداد
    return (
      <div className={`flex-1 h-12 rounded-2xl ring-1 flex items-center justify-center gap-1.5 font-bold text-sm ${style} opacity-70`}>
        <span>{meta.label}</span>
        <span className="text-xs opacity-80">{toFa(count)}</span>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onScore(type)}
      className={`flex-1 h-12 rounded-2xl ring-1 flex items-center justify-center gap-1.5 font-bold text-sm transition-transform active:scale-95 ${style}`}
    >
      <span className="text-base leading-none">{positive ? '+' : '−'}</span>
      <span>{meta.label}</span>
      <span className="text-xs bg-white/60 rounded-full px-1.5 py-0.5">{toFa(count)}</span>
    </button>
  )
}
