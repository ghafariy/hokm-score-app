import PlayerCard from './PlayerCard.jsx'
import { tally, totalOf } from '../lib/utils'

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
            onScore={(type) => onScore(player.id, type)}
            onLockedTap={onLockedTap}
          />
        )
      })}
    </div>
  )
}
