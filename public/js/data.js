// تنظیمات سایت، فهرست شرح‌ها و ارتباط با آپارات

import { store } from './util.js';
import { loc } from './i18n.js';

/** تنظیمات سراسری سایت */
export const SITE = {
  version: '1.1.0',

  // نشانیِ پراکسیِ آپارات (اختیاری). سایت بدون سرور هم کامل کار می‌کند و ویدیوهای آپارات را با پلیر رسمیِ
  // آپارات پخش می‌کند. اگر پراکسی راه بیندازید (proxy/ یا server.js)، نشانی‌اش را اینجا بگذارید تا
  // ویدیوهای آپارات در پلیرِ شارح پخش شوند (همگام‌سازیِ زنده‌ی ابیات، کیفیت و سرعت).
  // نمونه: 'https://shaareh-proxy.example.workers.dev/api/aparat/'
  aparatProxy: '',

  // حالت پیش‌فرض وقتی پراکسی هست: 'direct' (پلیر شارح) یا 'embed' (پلیر آپارات)
  aparatDefaultMode: 'direct',

  // راه‌های تماس در صفحه‌ی «دربارهٔ ما» — هرکدام خالی باشد نمایش داده نمی‌شود
  contact: {
    website: 'https://shaareh.ir/',
    aparat: 'https://www.aparat.com/shaareh.ir',
    github: 'https://github.com/aaal25882/shaareh',
    email: '',
  },
};

let catalogPromise;

export function loadCatalog() {
  catalogPromise ||= fetch('data/episodes.json', { cache: 'no-cache' }).then((r) => {
    if (!r.ok) throw new Error('episodes.json');
    return r.json();
  });
  return catalogPromise;
}

export function poetById(catalog, id) {
  return catalog.poets.find((p) => p.id === id) || { id, name: id || '', hue: 215 };
}

export const episodeById = (catalog, id) => catalog.episodes.find((e) => e.id === id) || null;

export const watchUrl = (ep, extra = '') => `watch.html?id=${encodeURIComponent(ep.id)}${extra}`;

/** نخستین مصراعِ شرح، برای کارت‌ها و اسلایدها */
export const firstLine = (ep) => {
  const v = ep.verses?.[0];
  return v ? v.text || v.m1 || '' : '';
};

export const epTitle = (ep) => loc(ep.title);

// ---------- آپارات ----------

/** نشانیِ پراکسی؛ روی localhost، سرورِ توسعه (server.js) خودش پراکسی دارد */
export function aparatProxyBase() {
  if (SITE.aparatProxy) return SITE.aparatProxy.endsWith('/') ? SITE.aparatProxy : SITE.aparatProxy + '/';
  if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) return 'api/aparat/';
  return null;
}

/** حالتِ پخشِ آپارات برای این بیننده: 'direct' یا 'embed' */
export function aparatMode() {
  if (!aparatProxyBase()) return 'embed';
  return store.get('aparat:mode', SITE.aparatDefaultMode) === 'embed' ? 'embed' : 'direct';
}

/** اطلاعات و لینک‌های فایلِ ویدیوی آپارات از پراکسی */
export async function fetchAparat(hash) {
  const base = aparatProxyBase();
  if (!base) throw new Error('no aparat proxy');
  const r = await fetch(base + encodeURIComponent(hash));
  const ct = r.headers.get('content-type') || '';
  if (!ct.includes('application/json')) throw new Error('aparat proxy unavailable');
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'aparat error');
  return data;
}

export const aparatEmbedUrl = (hash) => `https://www.aparat.com/video/video/embed/videohash/${hash}/vt/frame`;
export const aparatPageUrl = (hash) => `https://www.aparat.com/v/${hash}`;

/** پیش‌نویسی که استودیو برای پیش‌نمایش ذخیره کرده */
export const loadDraft = () => store.get('studio:preview');
