import PlayerCard from './PlayerCard.jsx'
import { EVENT_META, tally, totalOf, timeOf } from '../lib/utils'

/**
 * فید «آخرین تغییرات» — برای شفافیت، همه (بیننده و ادمین) می‌بینند
 * که چه تغییری، کِی و برای چه کسی ثبت شده است.
 */
function RecentChanges({ players, events }) {
  const recent = events.slice(-5).reverse() // ۵ مورد آخر، جدیدترین اول
  if (recent.length === 0) return null
  const playerName = (id) => players.find((p) => p.id === id)?.name ?? '؟'

  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 px-4 py-3 mb-1">
      <p className="text-[11px] text-slate-400 font-bold mb-2">آخرین تغییرات — برای همه قابل مشاهده</p>
      <ul className="space-y-1.5">
        {recent.map((e) => {
          const qty = e.qty ?? 1
          return (
            <li key={e.id} className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 shrink-0">{timeOf(e.created_at)}</span>
              <span
                className={`font-black w-5 text-center shrink-0 ${qty > 0 ? 'text-emerald-600' : 'text-rose-600'}`}
              >
                {qty > 0 ? '+' : '−'}
              </span>
              <span className="text-slate-600 font-bold truncate">
                {EVENT_META[e.event_type]?.label} برای {playerName(e.player_id)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * نمای کارتی همه بازیکنان (برای موبایل و دسکتاپ)
 */
export default function Scoreboard({ players, events, isAdmin, onScore, onLockedTap }) {
  if (players.length === 0) {
    return (
      <div className="bg-white rounded-3xl shadow-md ring-1 ring-black/5 p-10 text-center">
        <div className="text-4xl mb-3">👥</div>
        <p className="text-slate-500 font-bold">
          {isAdmin ? 'هنوز بازیکنی نیست — از دکمه «افزودن بازیکن» شروع کنید' : 'در انتظار ادمین تا بازیکنان را اضافه کند'}
        </p>
      </div>
    )
  }

  return (
    <div>
      <RecentChanges players={players} events={events} />
      <div className="grid gap-3 sm:grid-cols-2">
        {players.map((player) => {
          const counts = tally(events.filter((e) => e.player_id === player.id))
          return (
            <PlayerCard
              key={player.id}
              player={player}
              counts={counts}
              total={totalOf(counts)}
              isAdmin={isAdmin}
              onScore={(type, qty) => onScore(player.id, type, qty)}
              onLockedTap={onLockedTap}
            />
          )
        })}
      </div>
    </div>
  )
}
