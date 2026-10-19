/**
 * ابزارهای عمومی: متادیتای رویدادها، محاسبه امتیاز، تاریخ و اعداد فارسی
 */

// انواع رویداد امتیاز — با علامت اثر روی جمع کل
export const EVENT_META = {
  win: { label: 'برد', sign: 1 },
  loss: { label: 'باخت', sign: -1 },
  hakem_beat: { label: 'حاکم‌کت کرده', sign: 1 },
  hakem_beaten: { label: 'حاکم‌کت شده', sign: -1 },
  mars_done: { label: 'مارس کرده', sign: 1 },
  mars_received: { label: 'مارس شده', sign: -1 },
}

export const EVENT_TYPES = Object.keys(EVENT_META)

export function emptyCounts() {
  return { win: 0, loss: 0, hakem_beat: 0, hakem_beaten: 0, mars_done: 0, mars_received: 0 }
}

/** شمارش تعداد هر نوع رویداد از روی لیست رویدادها */
export function tally(events) {
  const counts = emptyCounts()
  for (const e of events) {
    if (counts[e.event_type] !== undefined) counts[e.event_type] += 1
  }
  return counts
}

/**
 * جمع کل امتیاز:
 * (برد + حاکم‌کت کرده + مارس کرده) − (باخت + حاکم‌کت شده + مارس شده)
 */
export function totalOf(counts) {
  return EVENT_TYPES.reduce((sum, type) => sum + counts[type] * EVENT_META[type].sign, 0)
}

const faNum = new Intl.NumberFormat('fa-IR')

/** عدد به فارسی (مثال: ۱۲) */
export function toFa(n) {
  return faNum.format(n ?? 0)
}

/** عدد به فارسی با علامت + برای اعداد مثبت (مثال: +۱۲) */
export function toFaSigned(n) {
  return (n > 0 ? '+' : '') + faNum.format(n ?? 0)
}

/** تاریخ میلادی ISO را به تاریخ شمسی تبدیل می‌کند (ورودی: رشته یا Date) */
export function parseDate(input) {
  if (input instanceof Date) return input
  // رشته‌های فقط-تاریخ (YYYY-MM-DD) باید به وقت محلی تفسیر شوند نه UTC
  const s = String(input)
  return new Date(s.length === 10 ? `${s}T00:00:00` : s)
}

export function jalaliLongDate(input) {
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric', month: 'long', day: 'numeric',
  }).format(parseDate(input))
}

/** تاریخ شمسی کوتاه مثل ۱۴۰۵/۰۷/۲۱ */
export function jalaliShortDate(input) {
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(parseDate(input))
}

/** ساعت مثل ۲۳:۱۵ */
export function timeOf(input) {
  return new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(parseDate(input))
}

/** تاریخ امروز به وقت محلی کاربر در فرمت ISO (برای ارسال به دیتابیس) */
export function localISODate(d = new Date()) {
  const pad = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// حروفی که در کد اتاق استفاده می‌شوند (بدون I و O و 0 و 1 تا اشتباه نشود)
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** ساخت کد اتاق تصادفی ۶ کاراکتری */
export function randomCode(len = 6) {
  const buf = new Uint32Array(len)
  crypto.getRandomValues(buf)
  let out = ''
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[buf[i] % CODE_ALPHABET.length]
  return out
}

/** نرمال‌سازی کد اتاق واردشده کاربر (حروف بزرگ، فقط حرف/عدد) */
export function normalizeCode(raw) {
  return String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}
