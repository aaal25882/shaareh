// چندزبانگی شارح: فارسی (پیش‌فرض)، انگلیسی، عربی
// متن‌ها در public/lang/<کد>.json — برای افزودن زبان، یک فایل و یک ردیف در LANGS کافی است.

import { store, setNumLang, num } from './util.js';

export const LANGS = [
  { code: 'fa', name: 'فارسی', dir: 'rtl', icon: 'icons/lang/fa.svg' },
  { code: 'en', name: 'English', dir: 'ltr', icon: 'icons/lang/en.svg' },
  { code: 'ar', name: 'العربية', dir: 'rtl', icon: 'icons/lang/ar.svg' },
];
export const DEFAULT_LANG = 'fa';

const known = (code) => LANGS.some((l) => l.code === code);

/** ترتیب: ?lang= در نشانی ← انتخابِ ذخیره‌شده ← فارسی */
function detectLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (known(q)) return q;
  const saved = store.get('lang');
  return known(saved) ? saved : DEFAULT_LANG;
}

export const lang = detectLang();
export const langInfo = LANGS.find((l) => l.code === lang);

let dict = {};
let fallback = {};

async function loadDict(code) {
  const r = await fetch(`lang/${code}.json`, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`lang/${code}.json`);
  return r.json();
}

export async function initI18n() {
  if (new URLSearchParams(location.search).has('lang')) store.set('lang', lang);
  setNumLang(lang);
  const html = document.documentElement;
  html.lang = lang;
  html.dir = langInfo.dir;
  try {
    const [d, f] = await Promise.all([loadDict(lang), lang === DEFAULT_LANG ? null : loadDict(DEFAULT_LANG)]);
    dict = d;
    fallback = f || d;
  } catch (err) {
    console.error('i18n:', err);
  }
  translateDom(document);
  html.classList.remove('i18n-pending');
}

const lookup = (obj, key) => key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);

/** t('panel.copied', {i: 3}) — عددها خودکار با ارقامِ زبان نوشته می‌شوند */
export function t(key, vars) {
  let s = lookup(dict, key) ?? lookup(fallback, key) ?? key;
  if (vars) {
    s = s.replace(/\{(\w+)\}/g, (m, k) => {
      if (!(k in vars)) return m;
      const v = vars[k];
      return typeof v === 'number' ? num(v) : String(v);
    });
  }
  return s;
}

/** فیلدِ چندزبانه‌ی داده: "متن" یا {fa, en, ar} */
export function loc(v) {
  if (v == null) return '';
  if (typeof v !== 'object' || Array.isArray(v)) return String(v);
  return v[lang] ?? v[DEFAULT_LANG] ?? Object.values(v)[0] ?? '';
}

/**
 * ترجمه‌ی DOM:
 *   data-i18n="key"                       → textContent
 *   data-i18n-attr="placeholder:key;aria-label:key2" → ویژگی‌ها
 */
export function translateDom(root) {
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-attr]')) {
    for (const pair of el.dataset.i18nAttr.split(';')) {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    }
  }
}

export function setLang(code) {
  if (!known(code)) return;
  store.set('lang', code);
  const url = new URL(location.href);
  if (code === DEFAULT_LANG) url.searchParams.delete('lang');
  else url.searchParams.set('lang', code);
  location.href = url.toString();
}

/** برای پیوندهای اشتراکی: نشانی با زبانِ جاری */
export function withLang(href) {
  if (lang === DEFAULT_LANG) return href;
  const url = new URL(href, location.href);
  url.searchParams.set('lang', lang);
  return url.toString();
}
