/**
 * پیام کوتاه (Toast) در پایین صفحه
 */
export default function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className="fixed z-[60] bottom-6 inset-x-0 flex justify-center px-4 pointer-events-none">
      <div
        key={toast.id}
        className={`animate-pop ${toast.kind === 'error' ? 'bg-rose-600' : 'bg-slate-900'} text-white rounded-2xl px-5 py-3 shadow-xl text-sm font-bold max-w-xs text-center`}
      >
        {toast.msg}
      </div>
    </div>
  )
}
