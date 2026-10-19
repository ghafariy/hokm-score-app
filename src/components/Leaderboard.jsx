import { useState } from 'react'
import { tally, totalOf, toFa, toFaSigned } from '../lib/utils'

/** جدول جامع رتبه‌بندی — مشابه جدول کاغذی با ستون‌های کامل */
export default function Leaderboard({ rows, sessionLabel, sessionDate, showScopeToggle = false, scope, onScopeChange }) {
  return (
    <div className="bg-white rounded-3xl shadow-md ring-1 ring-black/5 overflow-hidden">
      {/* سربرگ جدول */}
      <div className="px-4 py-3 bg-gradient-to-l from-teal-600 to-emerald-600 text-white">
        <h2 className="font-black text-lg">جدول امتیازات</h2>
        <p className="text-xs text-teal-100 mt-0.5">{sessionLabel}</p>
      </div>

      {/* سوییچ این دور / کل دوره‌ها */}
      {showScopeToggle && (
        <div className="flex gap-1 p-2 bg-slate-50 border-b border-slate-100">
          {[
            { id: 'session', label: 'این دور' },
            { id: 'all', label: 'کل دوره‌ها' },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => onScopeChange(opt.id)}
              className={`flex-1 h-9 rounded-xl text-sm font-bold transition-colors ${
                scope === opt.id ? 'bg-white text-teal-700 shadow-sm ring-1 ring-teal-200' : 'text-slate-500'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-center text-slate-400 py-10 font-bold">هنوز بازیکنی ثبت نشده است</p>
      ) : (
        <div className="table-scroll">
          <table className="w-full min-w-[560px] text-center border-collapse">
            <thead>
              <tr className="text-[11px] text-slate-500 bg-slate-50">
                <th className="py-2.5 px-2 font-bold sticky start-0 bg-slate-50">رتبه</th>
                <th className="py-2.5 px-2 font-bold sticky start-0 bg-slate-50 min-w-24 text-right">نام</th>
                <th className="py-2.5 px-1 font-bold">برد<br /><span className="text-emerald-600">+</span></th>
                <th className="py-2.5 px-1 font-bold">باخت<br /><span className="text-rose-600">−</span></th>
                <th className="py-2.5 px-1 font-bold">حاکم‌کت<br /><span className="text-emerald-600">+ / −</span></th>
                <th className="py-2.5 px-1 font-bold">مارس<br /><span className="text-emerald-600">+ / −</span></th>
                <th className="py-2.5 px-2 font-bold">جمع کل</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.player.id} className={`border-t border-slate-100 ${i % 2 ? 'bg-slate-50/50' : ''}`}>
                  <td className="py-2.5 px-2 sticky start-0 bg-inherit">
                    <RankBadge rank={i + 1} />
                  </td>
                  <td className="py-2.5 px-2 font-black text-slate-800 text-right sticky start-0 bg-inherit truncate max-w-28">
                    {row.player.name}
                  </td>
                  <td className="py-2.5 px-1 font-bold text-emerald-700">{toFa(row.counts.win)}</td>
                  <td className="py-2.5 px-1 font-bold text-rose-700">{toFa(row.counts.loss)}</td>
                  <td className="py-2.5 px-1 font-bold">
                    <span className="text-emerald-700">{toFa(row.counts.hakem_beat)}</span>
                    <span className="text-slate-300 mx-0.5">/</span>
                    <span className="text-rose-700">{toFa(row.counts.hakem_beaten)}</span>
                  </td>
                  <td className="py-2.5 px-1 font-bold">
                    <span className="text-emerald-700">{toFa(row.counts.mars_done)}</span>
                    <span className="text-slate-300 mx-0.5">/</span>
                    <span className="text-rose-700">{toFa(row.counts.mars_received)}</span>
                  </td>
                  <td className="py-2.5 px-2">
                    <span
                      className={`inline-block min-w-14 rounded-xl px-2 py-1 font-black ${
                        row.total > 0 ? 'bg-emerald-100 text-emerald-700' : row.total < 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                      }`}
                      dir="ltr"
                    >
                      {toFaSigned(row.total)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] text-slate-400 text-center py-2 px-4 leading-6">
        جمع کل = (برد + حاکم‌کت کرده + مارس کرده) − (باخت + حاکم‌کت شده + مارس شده)
      </p>
    </div>
  )
}

function RankBadge({ rank }) {
  const styles =
    rank === 1
      ? 'bg-amber-400 text-amber-950'
      : rank === 2
        ? 'bg-slate-300 text-slate-700'
        : rank === 3
          ? 'bg-orange-200 text-orange-900'
          : 'bg-slate-100 text-slate-500'
  return <span className={`inline-grid place-items-center w-7 h-7 rounded-full text-sm font-black ${styles}`}>{toFa(rank)}</span>
}

/**
 * محاسبه ردیف‌های جدول از روی بازیکنان و رویدادها
 * @param players لیست بازیکنان
 * @param events رویدادهای مورد نظر (یک دور یا همه دورها)
 */
export function buildRows(players, events) {
  return players
    .map((player) => {
      const counts = tally(events.filter((e) => e.player_id === player.id))
      return { player, counts, total: totalOf(counts) }
    })
    .sort((a, b) => b.total - a.total || a.player.name.localeCompare(b.player.name, 'fa'))
}
