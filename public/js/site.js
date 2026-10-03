// بخش‌های مشترک همه‌ی صفحه‌ها: نوار ناوبری (لوگو، منو، زبان، پوسته) و پانویس — بر اساس طراحی Shaareh-UI

import { t, lang, LANGS, langInfo, setLang, initI18n } from './i18n.js';
import { SITE } from './data.js';
import { store, h, num } from './util.js';

// آیکن‌های پوسته از طراحی اصلی
const SUN =
  '<svg viewBox="0 0 50 50" aria-hidden="true"><path d="M 24.90625 3.96875 C 24.863281 3.976563 24.820313 3.988281 24.78125 4 C 24.316406 4.105469 23.988281 4.523438 24 5 L 24 11 C 23.996094 11.359375 24.183594 11.695313 24.496094 11.878906 C 24.808594 12.058594 25.191406 12.058594 25.503906 11.878906 C 25.816406 11.695313 26.003906 11.359375 26 11 L 26 5 C 26.011719 4.710938 25.894531 4.433594 25.6875 4.238281 C 25.476563 4.039063 25.191406 3.941406 24.90625 3.96875 Z M 10.65625 9.84375 C 10.28125 9.910156 9.980469 10.183594 9.875 10.546875 C 9.769531 10.914063 9.878906 11.304688 10.15625 11.5625 L 14.40625 15.8125 C 14.648438 16.109375 15.035156 16.246094 15.410156 16.160156 C 15.78125 16.074219 16.074219 15.78125 16.160156 15.410156 C 16.246094 15.035156 16.109375 14.648438 15.8125 14.40625 L 11.5625 10.15625 C 11.355469 9.933594 11.054688 9.820313 10.75 9.84375 C 10.71875 9.84375 10.6875 9.84375 10.65625 9.84375 Z M 39.03125 9.84375 C 38.804688 9.875 38.59375 9.988281 38.4375 10.15625 L 34.1875 14.40625 C 33.890625 14.648438 33.753906 15.035156 33.839844 15.410156 C 33.925781 15.78125 34.21875 16.074219 34.589844 16.160156 C 34.964844 16.246094 35.351563 16.109375 35.59375 15.8125 L 39.84375 11.5625 C 40.15625 11.265625 40.246094 10.800781 40.0625 10.410156 C 39.875 10.015625 39.460938 9.789063 39.03125 9.84375 Z M 24.90625 15 C 24.875 15.007813 24.84375 15.019531 24.8125 15.03125 C 24.75 15.035156 24.6875 15.046875 24.625 15.0625 C 24.613281 15.074219 24.605469 15.082031 24.59375 15.09375 C 19.289063 15.320313 15 19.640625 15 25 C 15 30.503906 19.496094 35 25 35 C 30.503906 35 35 30.503906 35 25 C 35 19.660156 30.746094 15.355469 25.46875 15.09375 C 25.433594 15.09375 25.410156 15.0625 25.375 15.0625 C 25.273438 15.023438 25.167969 15.003906 25.0625 15 C 25.042969 15 25.019531 15 25 15 C 24.96875 15 24.9375 15 24.90625 15 Z M 24.9375 17 C 24.957031 17 24.980469 17 25 17 C 25.03125 17 25.0625 17 25.09375 17 C 29.46875 17.050781 33 20.613281 33 25 C 33 29.421875 29.421875 33 25 33 C 20.582031 33 17 29.421875 17 25 C 17 20.601563 20.546875 17.035156 24.9375 17 Z M 4.71875 24 C 4.167969 24.078125 3.78125 24.589844 3.859375 25.140625 C 3.9375 25.691406 4.449219 26.078125 5 26 L 11 26 C 11.359375 26.003906 11.695313 25.816406 11.878906 25.503906 C 12.058594 25.191406 12.058594 24.808594 11.878906 24.496094 C 11.695313 24.183594 11.359375 23.996094 11 24 L 5 24 C 4.96875 24 4.9375 24 4.90625 24 C 4.875 24 4.84375 24 4.8125 24 C 4.78125 24 4.75 24 4.71875 24 Z M 38.71875 24 C 38.167969 24.078125 37.78125 24.589844 37.859375 25.140625 C 37.9375 25.691406 38.449219 26.078125 39 26 L 45 26 C 45.359375 26.003906 45.695313 25.816406 45.878906 25.503906 C 46.058594 25.191406 46.058594 24.808594 45.878906 24.496094 C 45.695313 24.183594 45.359375 23.996094 45 24 L 39 24 C 38.96875 24 38.9375 24 38.90625 24 C 38.875 24 38.84375 24 38.8125 24 C 38.78125 24 38.75 24 38.71875 24 Z M 15 33.875 C 14.773438 33.90625 14.5625 34.019531 14.40625 34.1875 L 10.15625 38.4375 C 9.859375 38.679688 9.722656 39.066406 9.808594 39.441406 C 9.894531 39.8125 10.1875 40.105469 10.558594 40.191406 C 10.933594 40.277344 11.320313 40.140625 11.5625 39.84375 L 15.8125 35.59375 C 16.109375 35.308594 16.199219 34.867188 16.039063 34.488281 C 15.882813 34.109375 15.503906 33.867188 15.09375 33.875 C 15.0625 33.875 15.03125 33.875 15 33.875 Z M 34.6875 33.875 C 34.3125 33.941406 34.011719 34.214844 33.90625 34.578125 C 33.800781 34.945313 33.910156 35.335938 34.1875 35.59375 L 38.4375 39.84375 C 38.679688 40.140625 39.066406 40.277344 39.441406 40.191406 C 39.8125 40.105469 40.105469 39.8125 40.191406 39.441406 C 40.277344 39.066406 40.140625 38.679688 39.84375 38.4375 L 35.59375 34.1875 C 35.40625 33.988281 35.148438 33.878906 34.875 33.875 C 34.84375 33.875 34.8125 33.875 34.78125 33.875 C 34.75 33.875 34.71875 33.875 34.6875 33.875 Z M 24.90625 37.96875 C 24.863281 37.976563 24.820313 37.988281 24.78125 38 C 24.316406 38.105469 23.988281 38.523438 24 39 L 24 45 C 23.996094 45.359375 24.183594 45.695313 24.496094 45.878906 C 24.808594 46.058594 25.191406 46.058594 25.503906 45.878906 C 25.816406 45.695313 26.003906 45.359375 26 45 L 26 39 C 26.011719 38.710938 25.894531 38.433594 25.6875 38.238281 C 25.476563 38.039063 25.191406 37.941406 24.90625 37.96875 Z"/></svg>';
const MOON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 7a7 7 0 0 0 12 4.9v.1c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2h.1A6.979 6.979 0 0 0 10 7zm-6 5a8 8 0 0 0 15.062 3.762A9 9 0 0 1 8.238 4.938 7.999 7.999 0 0 0 4 12z"/></svg>';
const AUTO =
  '<svg viewBox="0 0 47.355 47.355" aria-hidden="true"><path d="M24.591,14.063c-0.161-0.36-0.519-0.592-0.913-0.592s-0.752,0.232-0.913,0.592L15.99,29.227 c-0.226,0.504,0.001,1.096,0.505,1.321c0.133,0.059,0.271,0.087,0.407,0.087c0.383,0,0.748-0.221,0.914-0.593l5.861-13.121 l1.441,3.227c0.226,0.504,0.814,0.731,1.321,0.505c0.504-0.225,0.731-0.817,0.505-1.321L24.591,14.063z M22.677,23.613c0,0.552,0.447,1,1,1h3.435l2.426,5.43c0.166,0.372,0.531,0.593,0.914,0.593 c0.136,0,0.274-0.028,0.407-0.087c0.504-0.226,0.73-0.817,0.505-1.321l-2.69-6.022c-0.161-0.36-0.519-0.592-0.913-0.592h-4.084 C23.125,22.613,22.677,23.061,22.677,23.613z M47.337,16.172L44.859,3.29c-0.07-0.363-0.335-0.659-0.689-0.767c-0.353-0.11-0.739-0.013-1,0.249l-4.51,4.511 C29.955-0.681,16.396-0.449,7.973,7.974C3.977,11.97,1.67,17.281,1.481,22.929c-0.019,0.552,0.413,1.015,0.966,1.033 c0.011,0,0.022,0,0.034,0c0.536,0,0.98-0.426,0.998-0.966c0.174-5.139,2.272-9.972,5.908-13.608c7.882-7.88,20.701-7.878,28.581,0 c0.375,0.375,1.039,0.375,1.414,0l3.868-3.869l1.844,9.581l-9.581-1.843l1.304-1.304c0.391-0.391,0.391-1.023,0-1.414 c-0.391-0.391-1.023-0.391-1.414,0l-2.637,2.637c-0.262,0.262-0.357,0.646-0.249,1c0.108,0.354,0.403,0.619,0.768,0.688 l12.882,2.478c0.325,0.062,0.661-0.04,0.896-0.275C47.296,16.833,47.4,16.497,47.337,16.172z M44.907,23.394c-0.011-0.001-0.022-0.001-0.034-0.001c-0.536,0-0.98,0.426-0.998,0.966 c-0.173,5.139-2.271,9.971-5.907,13.608c-7.881,7.88-20.7,7.878-28.581,0c-0.375-0.375-1.039-0.375-1.414,0l-3.868,3.869 l-1.844-9.581l9.581,1.843l-1.304,1.303c-0.391,0.39-0.391,1.023,0,1.414c0.391,0.391,1.023,0.391,1.414,0l2.637-2.636 c0.262-0.262,0.357-0.646,0.249-1c-0.108-0.354-0.403-0.619-0.768-0.688L1.189,30.013c-0.326-0.063-0.661,0.041-0.896,0.275 c-0.234,0.234-0.338,0.57-0.275,0.896l2.478,12.882c0.07,0.363,0.335,0.659,0.689,0.767c0.353,0.109,0.738,0.012,1-0.249 l4.51-4.511c4.229,3.869,9.606,5.803,14.981,5.803c5.688,0,11.375-2.165,15.705-6.495c3.997-3.997,6.303-9.308,6.491-14.955 C45.892,23.875,45.46,23.412,44.907,23.394z"/></svg>';
const BURGER =
  '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>';

/** پیش از هر چیز: ترجمه‌ها، ناوبری، پانویس و پوسته */
export async function initSite(page) {
  await initI18n();
  mountNav(page);
  mountFooter();
  initTheme();
}

// ---------- ناوبری ----------

function mountNav(page) {
  const slot = document.getElementById('site-nav');
  if (!slot) return;
  const links = [
    ['home', 'index.html', 'navbar.home'],
    ['content', 'index.html#content', 'navbar.content'],
    ['about', 'about.html', 'navbar.aboutus'],
    ['contact', 'about.html#contact', 'navbar.contactus'],
  ];

  slot.outerHTML = `
    <nav class="nav" aria-label="${t('title')}">
      <div class="container nav-inner">
        <div class="nav-pill nav-brand">
          <button class="nav-burger" type="button" aria-controls="nav-menu" aria-expanded="false">
            <span class="sr-only">${t('navbar.openmain')}</span>${BURGER}
          </button>
          <a class="brand" href="index.html">
            <img class="logo logo-for-light" src="icons/logo-ink.svg" alt="${t('navbar.logoalt')}">
            <img class="logo logo-for-dark" src="icons/logo-light.svg" alt="${t('navbar.logoalt')}">
            <span class="brand-name" lang="fa">شارح</span>
          </a>
        </div>
        <div class="nav-pill nav-tools">
          <div class="lang">
            <button class="nav-icon-btn lang-btn" type="button" aria-haspopup="true" aria-expanded="false" aria-label="${t('navbar.language')}" title="${langInfo.name}">
              <img src="${langInfo.icon}" alt="${langInfo.name}">
            </button>
            <ul class="lang-menu" role="menu">
              ${LANGS.map(
                (l) => `<li role="none"><button type="button" role="menuitemradio" aria-checked="${l.code === lang}" data-lang="${l.code}" lang="${l.code}">
                  <img src="${l.icon}" alt=""><span>${l.name}</span></button></li>`
              ).join('')}
            </ul>
          </div>
          <button class="nav-icon-btn theme-btn" type="button" aria-label="${t('navbar.themechange')}" title="${t('navbar.themechange')}"><span class="theme-ic"></span></button>
          <button class="nav-icon-btn theme-btn theme-auto" type="button" aria-label="${t('navbar.themeauto')}" title="${t('navbar.themeauto')}" hidden><span class="theme-ic">${AUTO}</span></button>
        </div>
        <div class="nav-menu" id="nav-menu">
          <ul class="nav-pill nav-links">
            ${links.map(([key, href, label]) => `<li><a href="${href}" data-nav="${key}"${key === page ? ' aria-current="page"' : ''}>${t(label)}</a></li>`).join('')}
          </ul>
        </div>
      </div>
    </nav>`;

  const nav = document.querySelector('.nav');
  const burger = nav.querySelector('.nav-burger');
  const menu = nav.querySelector('.nav-menu');
  burger.addEventListener('click', () => {
    const open = !menu.classList.contains('open');
    menu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
  });
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      menu.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });

  const langBtn = nav.querySelector('.lang-btn');
  const langMenu = nav.querySelector('.lang-menu');
  const setLangMenu = (open) => {
    langMenu.classList.toggle('open', open);
    langBtn.setAttribute('aria-expanded', String(open));
  };
  langBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setLangMenu(!langMenu.classList.contains('open'));
  });
  langMenu.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang]');
    if (b) setLang(b.dataset.lang);
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.lang')) setLangMenu(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      setLangMenu(false);
      menu.classList.remove('open');
    }
  });
}

// ---------- پوسته (روشن / تیره / خودکار) ----------

function initTheme() {
  const media = matchMedia('(prefers-color-scheme: dark)');
  const btn = document.querySelector('.theme-btn:not(.theme-auto)');
  const autoBtn = document.querySelector('.theme-auto');

  const apply = () => {
    const pref = store.get('theme', 'auto');
    const dark = pref === 'dark' || (pref === 'auto' && media.matches);
    const root = document.documentElement;
    root.classList.toggle('dark', dark);
    root.classList.toggle('light', !dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#110e0b' : '#f5efe3');
    if (btn) btn.querySelector('.theme-ic').innerHTML = dark ? SUN : MOON;
    if (autoBtn) autoBtn.hidden = pref === 'auto';
  };

  btn?.addEventListener('click', () => {
    const dark = document.documentElement.classList.contains('dark');
    store.set('theme', dark ? 'light' : 'dark');
    apply();
  });
  autoBtn?.addEventListener('click', () => {
    store.set('theme', 'auto');
    apply();
  });
  media.addEventListener('change', () => {
    if (store.get('theme', 'auto') === 'auto') apply();
  });
  apply();
}

// ---------- پانویس ----------

function mountFooter() {
  const slot = document.getElementById('site-footer');
  if (!slot) return;
  const footer = h(
    'footer',
    { class: 'site-footer' },
    h(
      'div',
      { class: 'container footer-inner' },
      h(
        'div',
        { class: 'footer-brand' },
        h('img', { class: 'logo-for-light', src: 'icons/logo-ink.svg', alt: '' }),
        h('img', { class: 'logo-for-dark', src: 'icons/logo-light.svg', alt: '' }),
        h('div', {}, h('b', {}, t('title')), h('p', {}, t('footer.about')))
      ),
      h(
        'nav',
        { class: 'footer-links', 'aria-label': t('title') },
        h('a', { href: 'index.html#content' }, t('navbar.content')),
        h('a', { href: 'about.html' }, t('navbar.aboutus')),
        h('a', { href: 'about.html#contact' }, t('navbar.contactus')),
        h('a', { href: 'studio.html' }, t('footer.studio'))
      ),
      h('p', { class: 'footer-meta' }, `${t('footer.credits')} · ${t('footer.version', { v: num(SITE.version) })}`)
    )
  );
  slot.replaceWith(footer);
}
