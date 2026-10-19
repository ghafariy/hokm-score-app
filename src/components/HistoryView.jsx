import { EVENT_META, toFa, timeOf, jalaliLongDate } from '../lib/utils'
import { buildRows } from './Leaderboard.jsx'

/**
 * نمای تاریخچه: آرشیو دوره‌های قبلی + لاگ رویدادهای دور جاری
 */
export default function HistoryView({ players, sessions, events, activeSession, isAdmin, onDeleteSession, onClearSession }) {
  const pastSessions = sessions.filter((s) => !s.is_active)

  // رویدادهای دور جاری به همراه نام بازیکن
  const activeEvents = activeSession
    ? events
        .filter((e) => e.session_id === activeSession.id)
        .slice()
        .reverse() // جدیدترین اول
    : []

  const playerName = (id) => players.find((p) => p.id === id)?.name ?? '؟'

  return (
    <div className="space-y-4">
      {/* لاگ رویدادهای دور جاری */}
      <div className="bg-white rounded-3xl shadow-md ring-1 ring-black/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-black text-slate-800">لاگ دور جاری</h2>
          {activeSession && <span className="text-xs text-slate-400">{activeSession.title}</span>}
        </div>
        {activeEvents.length === 0 ? (
          <p className="text-center text-slate-400 py-8 font-bold">هنوز رویدادی ثبت نشده</p>
        ) : (
          <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {activeEvents.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="text-slate-400 w-12 shrink-0">{timeOf(e.created_at)}</span>
                <span
                  className={`font-bold w-5 text-center ${EVENT_META[e.event_type]?.sign > 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                >
                  {EVENT_META[e.event_type]?.sign > 0 ? '+' : '−'}
                </span>
                <span className="text-slate-700 font-bold flex-1">
                  {EVENT_META[e.event_type]?.label} برای {playerName(e.player_id)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* آرشیو دورهای قبلی */}
      <div className="bg-white rounded-3xl shadow-md ring-1 ring-black/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="font-black text-slate-800">آرشیو شب‌های قبلی</h2>
        </div>
        {pastSessions.length === 0 ? (
          <p className="text-center text-slate-400 py-8 font-bold">هنوز دور بسته‌ای ندارید</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pastSessions.map((session) => {
              const rows = buildRows(players, events.filter((e) => e.session_id === session.id))
              return (
                <li key={session.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-black text-slate-800">{session.title}</p>
                      <p className="text-xs text-slate-400">{jalaliLongDate(session.session_date)}</p>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => onClearSession(session)}
                          className="text-xs font-bold text-slate-500 bg-slate-100 rounded-xl px-3 py-1.5 active:bg-slate-200"
                        >
                          پاک کردن امتیازات
                        </button>
                        <button
                          onClick={() => onDeleteSession(session)}
                          className="text-xs font-bold text-rose-600 bg-rose-50 rounded-xl px-3 py-1.5 active:bg-rose-100"
                        >
                          حذف دور
                        </button>
                      </div>
                    )}
                  </div>

                  {rows.length > 0 && (
                    <table className="w-full text-center text-sm">
                      <thead>
                        <tr className="text-[11px] text-slate-400">
                          <th className="py-1 text-right">نام</th>
                          <th className="py-1">برد</th>
                          <th className="py-1">باخت</th>
                          <th className="py-1">حاکم‌کت</th>
                          <th className="py-1">مارس</th>
                          <th className="py-1">جمع</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={r.player.id} className="border-t border-slate-50">
                            <td className="py-1.5 font-bold text-slate-700 text-right truncate max-w-24">{r.player.name}</td>
                            <td className="py-1.5 text-emerald-700 font-bold">{toFa(r.counts.win)}</td>
                            <td className="py-1.5 text-rose-700 font-bold">{toFa(r.counts.loss)}</td>
                            <td className="py-1.5 font-bold">
                              <span className="text-emerald-700">{toFa(r.counts.hakem_beat)}</span>
                              <span className="text-slate-300">/</span>
                              <span className="text-rose-700">{toFa(r.counts.hakem_beaten)}</span>
                            </td>
                            <td className="py-1.5 font-bold">
                              <span className="text-emerald-700">{toFa(r.counts.mars_done)}</span>
                              <span className="text-slate-300">/</span>
                              <span className="text-rose-700">{toFa(r.counts.mars_received)}</span>
                            </td>
                            <td className={`py-1.5 font-black ${r.total > 0 ? 'text-emerald-700' : r.total < 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                              {r.total > 0 ? '+' : ''}
                              {toFa(r.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
