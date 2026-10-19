/**
 * مودال ساده — از پایین باز می‌شود (شبیه شیت موبایل)
 */
export default function Modal({ open, title, onClose, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 pb-7 animate-pop max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-slate-800 text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 text-lg font-bold active:bg-slate-200"
            aria-label="بستن"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/**
 * مودال تایید عملیات حساس (حذف، پاک کردن و…)
 */
export function ConfirmModal({ open, title, message, confirmLabel = 'تایید', danger = false, onConfirm, onClose }) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="text-slate-600 leading-8 mb-5">{message}</p>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 h-12 rounded-2xl bg-slate-100 text-slate-700 font-bold active:bg-slate-200"
        >
          انصراف
        </button>
        <button
          onClick={onConfirm}
          className={`flex-1 h-12 rounded-2xl text-white font-black ${
            danger ? 'bg-rose-600 active:bg-rose-700' : 'bg-teal-600 active:bg-teal-700'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
