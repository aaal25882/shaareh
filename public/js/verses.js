// پنل ابیات — فهرست بیت‌ها کنار پلیر؛ کلیک روی هر بیت، ویدیو را به لحظه‌ی شرح همان بیت می‌برد.
// ابیات به ترتیبِ شعر می‌مانند و زمان‌ها لازم نیست صعودی باشند.
// رویدادها: select {index} · close · share {index}

import { icon } from './icons.js';
import { t, loc } from './i18n.js';
import { num, formatTime, normalizeFa, h } from './util.js';

const USER_SCROLL_GRACE = 4000;
const timed = (v) => Number.isFinite(v?.t);

export class VersePanel extends EventTarget {
  constructor(root) {
    super();
    this.root = root;
    this.verses = [];
    this.active = -1;
    this.duration = 0;
    this.lastUserScroll = 0;
    this.build();
  }

  build() {
    this.root.classList.add('vp');
    this.root.innerHTML = `
      <header class="vp-head">
        <div class="vp-titles">
          <span class="vp-kicker"></span>
          <h2 class="vp-title"></h2>
        </div>
        <button type="button" class="vp-close" aria-label="${t('panel.close')}" title="${t('panel.close')}">${icon('close')}</button>
      </header>
      <div class="vp-tools">
        <label class="vp-search">
          ${icon('search')}
          <input type="search" placeholder="${t('panel.search')}" aria-label="${t('panel.search')}">
        </label>
        <p class="vp-hint">${t('panel.hint')}</p>
        <p class="vp-status" hidden></p>
      </div>
      <ol class="vp-list" role="list" aria-label="${t('panel.label')}"></ol>
      <p class="vp-empty" hidden>${t('panel.noMatch')}</p>`;

    this.kicker = this.root.querySelector('.vp-kicker');
    this.titleEl = this.root.querySelector('.vp-title');
    this.list = this.root.querySelector('.vp-list');
    this.search = this.root.querySelector('input[type="search"]');
    this.emptyEl = this.root.querySelector('.vp-empty');
    this.statusEl = this.root.querySelector('.vp-status');

    this.root.querySelector('.vp-close').addEventListener('click', () => this.dispatchEvent(new CustomEvent('close')));
    this.search.addEventListener('input', () => this.filter(this.search.value));

    this.list.addEventListener('click', (e) => {
      const share = e.target.closest('.vp-share');
      if (share) {
        this.dispatchEvent(new CustomEvent('share', { detail: { index: Number(share.dataset.index) } }));
        return;
      }
      const btn = e.target.closest('.vp-verse');
      if (btn && !btn.disabled) this.dispatchEvent(new CustomEvent('select', { detail: { index: Number(btn.dataset.index) } }));
    });

    // اگر کاربر خودش فهرست را اسکرول می‌کند، اسکرول خودکار مزاحمش نشود
    const markUser = () => (this.lastUserScroll = performance.now());
    this.list.addEventListener('wheel', markUser, { passive: true });
    this.list.addEventListener('touchmove', markUser, { passive: true });
    this.list.addEventListener('keydown', (e) => this.onListKey(e));
  }

  /** verses: [{t, m1, m2} | {t, text}] به ترتیب شعر؛ note می‌تواند چندزبانه باشد */
  setData({ title, kicker, verses, duration = 0, status = '' }) {
    this.titleEl.textContent = title || '';
    this.kicker.textContent = kicker || '';
    this.verses = verses || [];
    this.duration = duration;
    this.active = -1;
    this.setStatus(status);
    this.render();
  }

  setStatus(text) {
    this.statusEl.hidden = !text;
    this.statusEl.textContent = text || '';
  }

  setDuration(d) {
    this.duration = d;
  }

  render() {
    const items = this.verses.map((v, i) => {
      const body = v.text
        ? h('span', { class: 'vp-text vp-prose' }, v.text)
        : h('span', { class: 'vp-text' }, h('span', { class: 'vp-m1' }, v.m1 || ''), h('span', { class: 'vp-m2' }, v.m2 || ''));
      const ok = timed(v);
      const note = loc(v.note);
      return h(
        'li',
        { class: 'vp-item', dataset: { index: i } },
        h(
          'div',
          { class: 'vp-row' },
          h(
            'button',
            {
              type: 'button',
              class: 'vp-verse',
              lang: 'fa',
              dataset: { index: i },
              disabled: !ok,
              'aria-label': ok ? t('panel.jump', { i: i + 1, t: formatTime(v.t) }) : t('panel.noTime', { i: i + 1 }),
            },
            h('span', { class: 'vp-num', 'aria-hidden': 'true' }, num(i + 1)),
            body,
            h('span', { class: 'vp-time' }, ok ? formatTime(v.t) : '—'),
            h('span', { class: 'vp-progress', 'aria-hidden': 'true' }, h('i'))
          ),
          ok
            ? h('button', { type: 'button', class: 'vp-share', dataset: { index: i }, 'aria-label': t('panel.share'), title: t('panel.share'), html: icon('link') })
            : null
        ),
        note ? h('p', { class: 'vp-note' }, note) : null
      );
    });
    if (!items.length) this.list.replaceChildren(h('li', { class: 'vp-none' }, t('panel.none')));
    else this.list.replaceChildren(...items);
    this.items = [...this.list.querySelectorAll('.vp-item')];
  }

  /** بیتی که آخرین بار پیش از این لحظه شروع شده است */
  indexAt(time) {
    let idx = -1;
    this.verses.forEach((v, i) => {
      if (timed(v) && v.t <= time + 0.05 && (idx < 0 || v.t >= this.verses[idx].t)) idx = i;
    });
    return idx;
  }

  /** با هر به‌روزرسانی زمان پلیر فراخوانی می‌شود */
  update(time) {
    const idx = this.indexAt(time);
    if (idx !== this.active) this.setActive(idx);
    if (idx < 0) return;
    const start = this.verses[idx].t;
    // پایانِ این بخش: زودترین بیتی که بعد از این بیت شروع می‌شود
    let end = this.duration || start + 30;
    for (const v of this.verses) if (timed(v) && v.t > start && v.t < end) end = v.t;
    const p = end > start ? (time - start) / (end - start) : 0;
    const bar = this.items[idx]?.querySelector('.vp-progress i');
    if (bar) bar.style.transform = `scaleX(${Math.min(1, Math.max(0, p))})`;
  }

  setActive(idx, { scroll = true } = {}) {
    const prev = this.items?.[this.active];
    if (prev) {
      prev.classList.remove('is-active');
      prev.querySelector('.vp-verse').removeAttribute('aria-current');
      prev.querySelector('.vp-progress i').style.transform = 'scaleX(0)';
    }
    this.active = idx;
    const cur = this.items?.[idx];
    if (!cur) return;
    cur.classList.add('is-active');
    cur.querySelector('.vp-verse').setAttribute('aria-current', 'true');
    if (scroll && performance.now() - this.lastUserScroll > USER_SCROLL_GRACE) this.scrollToItem(cur);
  }

  /** پس از باز شدن پنل، بیتِ فعال را در دید نگه می‌دارد */
  revealActive() {
    const item = this.items?.[this.active];
    if (item) this.scrollToItem(item);
  }

  scrollToItem(item) {
    if (item.hidden) return;
    const list = this.list;
    const top = item.offsetTop - list.clientHeight / 2 + item.offsetHeight / 2;
    list.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  filter(query) {
    const q = normalizeFa(query);
    let shown = 0;
    this.items.forEach((item, i) => {
      const v = this.verses[i];
      const note = v.note && typeof v.note === 'object' ? Object.values(v.note).join(' ') : v.note;
      const hay = normalizeFa([v.m1, v.m2, v.text, note].filter(Boolean).join(' '));
      const match = !q || hay.includes(q);
      item.hidden = !match;
      if (match) shown++;
    });
    this.emptyEl.hidden = shown > 0 || !this.items.length;
  }

  onListKey(e) {
    if (e.code !== 'ArrowDown' && e.code !== 'ArrowUp') return;
    const buttons = [...this.list.querySelectorAll('.vp-item:not([hidden]) .vp-verse')];
    const i = buttons.indexOf(document.activeElement);
    if (i < 0) return;
    const next = buttons[i + (e.code === 'ArrowDown' ? 1 : -1)];
    if (next) {
      next.focus();
      e.preventDefault();
      e.stopPropagation();
    }
  }
}
