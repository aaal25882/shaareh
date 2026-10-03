// صفحه‌ی اصلی: اسلایدر تمام‌صفحه، فالِ شارح، فیلتر شاعران، شبکه‌ی شرح‌ها و جعبه‌ی آپارات

import { initSite } from './site.js';
import { t, loc } from './i18n.js';
import { loadCatalog, poetById, episodeById, watchUrl, epTitle } from './data.js';
import { icon } from './icons.js';
import { videoCard } from './cards.js';
import { num, normalizeFa, h, parseAparat } from './util.js';

const state = { poet: null, q: '' };
let catalog;

await initSite('home');
document.title = `${t('title')} — ${t('tagline')}`;
for (const el of document.querySelectorAll('.how-num [data-num]')) el.textContent = num(el.dataset.num);

try {
  catalog = await loadCatalog();
  state.poet = new URLSearchParams(location.search).get('poet');
  renderHero();
  initFal();
  renderChips();
  renderGrid();
} catch (err) {
  console.error(err);
  document.getElementById('videos').replaceChildren(h('p', { class: 'empty-note' }, t('home.loadError')));
}

/** بیت به شکلِ دو مصراعِ پلکانی؛ ink=true یعنی با جوهر نوشته شود */
function verseLines(v, cls, ink) {
  if (!v) return null;
  const w = ink ? ' ink-write' : '';
  if (v.text) return h('p', { class: cls, lang: 'fa', dir: 'rtl' }, h('span', { class: `prose${w}` }, v.text));
  return h(
    'p',
    { class: cls, lang: 'fa', dir: 'rtl' },
    h('span', { class: `m1${w}` }, v.m1 || ''),
    h('span', { class: `m2${w}${ink ? ' line-2' : ''}` }, v.m2 || '')
  );
}

/** با برداشتن و گذاشتنِ کلاس، انیمیشنِ جوهر از نو اجرا می‌شود */
function rewrite(el) {
  for (const s of el.querySelectorAll('.ink-write')) {
    s.classList.remove('ink-write');
    void s.offsetWidth;
    s.classList.add('ink-write');
  }
}

// ---------- اسلایدر (Carousel) ----------

function renderHero() {
  const slidesEl = document.getElementById('slides');
  const dotsEl = document.getElementById('hero-dots');
  const slides = (catalog.slides || []).map((s) => ({ ...s, ep: episodeById(catalog, s.episode) })).filter((s) => s.image);
  if (!slides.length) return;

  slidesEl.replaceChildren(
    ...slides.map((s, i) => {
      const ep = s.ep;
      const poet = ep ? poetById(catalog, ep.poet) : null;
      const vi = s.verse ?? 0;
      const v = ep?.verses?.[vi];
      return h(
        'article',
        { class: `slide${i === 0 ? ' is-active' : ''}`, 'aria-roledescription': 'slide', 'aria-hidden': String(i !== 0) },
        h('img', { src: s.image, alt: '', loading: i === 0 ? 'eager' : 'lazy', decoding: 'async' }),
        ep
          ? h(
              'div',
              { class: 'slide-caption' },
              h('span', { class: 'slide-kicker' }, h('i', { class: 'nuqta' }), [loc(poet?.name), loc(ep.book)].filter(Boolean).join(' · '), h('i', { class: 'nuqta' })),
              h('h2', { class: 'slide-title' }, loc(s.title) || epTitle(ep)),
              verseLines(v, 'slide-verse', true),
              h(
                'div',
                { class: 'slide-actions' },
                h('a', {
                  class: 'btn btn-flame',
                  href: watchUrl(ep, Number.isFinite(v?.t) ? `&v=${vi + 1}` : ''),
                  tabindex: i === 0 ? null : '-1',
                  html: `${icon('play')}<span>${t('hero.watch')}</span>`,
                })
              )
            )
          : null
      );
    })
  );

  dotsEl.replaceChildren(
    ...slides.map((_, i) => h('button', { type: 'button', 'aria-label': t('hero.goto', { n: i + 1 }), 'aria-current': String(i === 0), onclick: () => go(i, true) }))
  );

  const els = [...slidesEl.children];
  const dots = [...dotsEl.children];
  let index = 0;
  let timer;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function go(i, user) {
    index = (i + els.length) % els.length;
    els.forEach((el, k) => {
      const on = k === index;
      el.classList.toggle('is-active', on);
      el.setAttribute('aria-hidden', String(!on));
      el.querySelector('a')?.setAttribute('tabindex', on ? '0' : '-1');
      if (on) rewrite(el);
    });
    dots.forEach((d, k) => d.setAttribute('aria-current', String(k === index)));
    if (user) restart();
  }
  function restart() {
    clearInterval(timer);
    if (!reduced && els.length > 1) timer = setInterval(() => go(index + 1), 9000);
  }

  document.getElementById('hero-prev').addEventListener('click', () => go(index - 1, true));
  document.getElementById('hero-next').addEventListener('click', () => go(index + 1, true));
  const hero = document.getElementById('hero');
  hero.addEventListener('pointerenter', () => clearInterval(timer));
  hero.addEventListener('pointerleave', restart);
  hero.addEventListener('focusin', () => clearInterval(timer));
  hero.addEventListener('focusout', restart);

  // کشیدن با انگشت
  let startX = null;
  hero.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') startX = e.clientX;
  });
  hero.addEventListener('pointerup', (e) => {
    if (startX == null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) < 50) return;
    const forward = document.documentElement.dir === 'rtl' ? dx > 0 : dx < 0;
    go(index + (forward ? 1 : -1), true);
  });

  if (els.length < 2) {
    document.getElementById('hero-prev').hidden = true;
    document.getElementById('hero-next').hidden = true;
    dotsEl.hidden = true;
  }
  restart();
}

document.getElementById('scroll-down').addEventListener('click', () => {
  document.getElementById('fal').scrollIntoView({ behavior: 'smooth' });
});

// ---------- فالِ شارح ----------

function initFal() {
  const pool = [];
  for (const ep of catalog.episodes) {
    (ep.verses || []).forEach((v, i) => {
      if (Number.isFinite(v.t)) pool.push({ ep, v, i });
    });
  }
  const card = document.getElementById('fal-card');
  const body = document.getElementById('fal-body');
  const btn = document.getElementById('fal-draw');
  const label = btn.querySelector('span');
  let last = -1;

  if (!pool.length) {
    body.replaceChildren(h('p', { class: 'fal-placeholder' }, t('fal.empty')));
    btn.disabled = true;
    return;
  }

  btn.addEventListener('click', () => {
    let k = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && k === last) k = (k + 1) % pool.length;
    last = k;
    const { ep, v, i } = pool[k];
    const poet = poetById(catalog, ep.poet);
    card.classList.add('drawing');
    body.replaceChildren();
    setTimeout(() => {
      card.classList.remove('drawing');
      const note = loc(v.note);
      body.replaceChildren(
        ...[
          verseLines(v, 'fal-verse', true),
          h('p', { class: 'fal-source' }, h('i', { class: 'nuqta' }), [loc(poet.name), loc(ep.poem) || epTitle(ep)].filter(Boolean).join(' · '), h('i', { class: 'nuqta' })),
          note ? h('p', { class: 'fal-note' }, note) : null,
          h('div', { class: 'fal-actions' }, h('a', { class: 'btn btn-flame btn-sm', href: watchUrl(ep, `&v=${i + 1}`), html: `${icon('play')}<span>${t('fal.listen')}</span>` })),
        ].filter(Boolean)
      );
      label.textContent = t('fal.again');
    }, 900);
  });
}

// ---------- فیلتر شاعران ----------

function renderChips() {
  const counts = new Map();
  for (const e of catalog.episodes) counts.set(e.poet, (counts.get(e.poet) || 0) + 1);
  const chip = (id, label, count) =>
    h(
      'button',
      {
        type: 'button',
        class: 'chip',
        'aria-pressed': String(state.poet === id),
        onclick: () => {
          state.poet = id;
          renderChips();
          renderGrid();
          const url = new URL(location.href);
          if (id) url.searchParams.set('poet', id);
          else url.searchParams.delete('poet');
          history.replaceState(null, '', url);
        },
      },
      count ? `${label} (${num(count)})` : label
    );
  document
    .getElementById('poet-chips')
    .replaceChildren(chip(null, t('home.all')), ...catalog.poets.filter((p) => counts.get(p.id)).map((p) => chip(p.id, loc(p.name), counts.get(p.id))));
}

// ---------- شبکه‌ی ویدیوها ----------

function renderGrid() {
  const q = normalizeFa(state.q);
  const list = catalog.episodes.filter((e) => {
    if (state.poet && e.poet !== state.poet) return false;
    if (!q) return true;
    const p = poetById(catalog, e.poet);
    const parts = [e.title, e.book, e.poem, e.summary, e.presenter, p.name].flatMap((f) => (f && typeof f === 'object' ? Object.values(f) : [f]));
    for (const v of e.verses || []) parts.push(v.m1, v.m2, v.text);
    return normalizeFa(parts.filter(Boolean).join(' ')).includes(q);
  });
  const grid = document.getElementById('videos');
  grid.replaceChildren(...(list.length ? list.map((e) => videoCard(e, catalog)) : [h('p', { class: 'empty-note' }, t('home.empty'))]));
}

document.getElementById('ep-search').addEventListener('input', (e) => {
  state.q = e.target.value;
  if (catalog) renderGrid();
});

// ---------- لینک آپارات ----------

document.getElementById('aparat-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const hash = parseAparat(form.elements.url.value);
  const msg = form.querySelector('.form-msg');
  if (!hash) {
    msg.textContent = t('aparatBox.invalid');
    return;
  }
  msg.textContent = '';
  const target = e.submitter?.value === 'studio' ? 'studio.html' : 'watch.html';
  location.href = `${target}?aparat=${encodeURIComponent(hash)}`;
});
