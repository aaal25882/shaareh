// ابزارهای مشترک شارح

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

let digits = FA_DIGITS;

/** زبانِ عددها را تعیین می‌کند (fa: ارقام فارسی، ar: عربی-هندی، دیگر زبان‌ها: لاتین) */
export function setNumLang(code) {
  digits = code === 'fa' ? FA_DIGITS : code === 'ar' ? AR_DIGITS : null;
}

/** عدد یا متن را با ارقامِ زبانِ جاری می‌نویسد */
export const num = (v) => (digits ? String(v).replace(/\d/g, (d) => digits[d]) : String(v));

export const toLatinDigits = (s) =>
  String(s)
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));

/** ثانیه → «۰۳:۲۱» یا «۱:۰۳:۲۱» (با ارقامِ زبانِ جاری؛ fa:false برای ارقام لاتین) */
export function formatTime(sec, { fa = true } = {}) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  const out = h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  return fa ? num(out) : out;
}

/** «۱:۲۳»، «1:02:03»، «83» یا «83.5» → ثانیه؛ در صورت نامعتبر بودن null */
export function parseTime(input) {
  const s = toLatinDigits(String(input ?? '')).trim().replace(/[٫,]/g, '.');
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  const parts = s.split(':');
  if (parts.length > 3 || parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return null;
  return parts.reduce((acc, p) => acc * 60 + Number(p), 0);
}

/** حذف اعراب، نیم‌فاصله و یکسان‌سازی حروف برای جست‌وجو */
export function normalizeFa(s) {
  return String(s || '')
    .replace(/[ً-ٰٟۖ-ۭ]/g, '')
    .replace(/[‌‍‎‏]/g, '')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** شناسه‌ی ویدیو را از لینک یا کد آپارات بیرون می‌کشد */
export function parseAparat(input) {
  const s = String(input || '').trim();
  if (!s) return null;
  if (/^[A-Za-z0-9]{3,24}$/.test(s)) return s;
  const m =
    s.match(/aparat\.com\/v\/([A-Za-z0-9]+)/i) ||
    s.match(/videohash\/([A-Za-z0-9]+)/i) ||
    s.match(/aparat\.com\/embed\/([A-Za-z0-9]+)/i);
  return m ? m[1] : null;
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/** ساخت عنصر: h('button', {class: 'x', onclick}, 'متن', child) */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export const store = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem('shaareh:' + key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem('shaareh:' + key, JSON.stringify(value));
    } catch {
      /* حالت خصوصی یا فضای پر — بی‌اهمیت */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem('shaareh:' + key);
    } catch {
      /* بی‌اهمیت */
    }
  },
};

let toastTimer;
export function toast(message) {
  let el = document.getElementById('site-toast');
  if (!el) {
    el = h('div', { id: 'site-toast', class: 'site-toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(el);
  }
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = h('textarea', { style: 'position:fixed;opacity:0' });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}
