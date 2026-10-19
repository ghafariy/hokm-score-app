/**
 * صفحه‌ای که وقتی هنوز کلیدهای Supabase در فایل .env وارد نشده باشند نمایش داده می‌شود.
 */
export default function SetupNotice() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl ring-1 ring-black/5 p-7 space-y-4">
        <div className="text-5xl">🃏</div>
        <h1 className="text-2xl font-black text-slate-800">جدول امتیاز حکم</h1>
        <p className="text-slate-600 leading-8">
          برای اجرای برنامه، ابتدا باید تنظیمات دیتابیس آنلاین (Supabase) را وارد کنید.
        </p>
        <ol className="list-decimal ps-5 space-y-2 text-sm text-slate-700 leading-7 bg-slate-50 rounded-2xl p-4">
          <li>
            فایل <code className="bg-slate-200 rounded px-1">.env.example</code> را به نام{' '}
            <code className="bg-slate-200 rounded px-1">.env</code> کپی کنید.
          </li>
          <li>
            آدرس پروژه و کلید <b>Anon Key</b> را از پنل Supabase (بخش API) داخل آن بگذارید.
          </li>
          <li>فایل supabase/schema.sql را در SQL Editor پروژه اجرا کنید.</li>
          <li>سپس برنامه را دوباره اجرا کنید.</li>
        </ol>
        <p className="text-xs text-slate-400">راهنمای کامل: فایل README.md در پوشه پروژه</p>
      </div>
    </div>
  )
}
