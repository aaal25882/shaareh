// پلیر اختصاصی شارح
// دو حالت: «video» (پخش مستقیم MP4 — فایل خودمان یا فایل‌های آپارات) و «embed» (iframe آپارات).
// رویدادها: timeupdate {time} · loaded {duration} · statechange {playing} · fatal {error} · panel · verse {index}

import { icon, skipIcon } from './icons.js';
import { formatTime, num, clamp, h, store } from './util.js';
import { t, lang } from './i18n.js';

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];

const percent = (v) => `${num(Math.round(v * 100))}${lang === 'en' ? '%' : '٪'}`;
const IDLE_MS = 2600;

export class ShaarehPlayer extends EventTarget {
  constructor(root, { fullscreenTarget, keyboard = true } = {}) {
    super();
    this.root = root;
    this.fsTarget = fullscreenTarget || root;
    this.mode = 'idle';
    this.sources = [];
    this.sourceIndex = 0;
    this.markers = [];
    this.durationHint = 0;
    this.captionsOn = store.get('player:captions', false);
    this.lastTime = -1;
    this.activeMarker = -1;
    this.build();
    this.bind();
    if (keyboard) document.addEventListener('keydown', (e) => this.onKey(e));
  }

  // ---------- ساخت DOM ----------

  build() {
    const r = this.root;
    r.classList.add('sp');
    r.dataset.mode = 'idle';
    r.dataset.state = 'paused';
    const dir = document.documentElement.dir || 'rtl';
    r.innerHTML = `
      <div class="sp-screen">
        <video class="sp-video" playsinline preload="metadata"></video>
        <div class="sp-embed" hidden></div>
        <div class="sp-caption" lang="fa" hidden><span class="sp-cap-m1"></span><span class="sp-cap-m2"></span></div>
        <div class="sp-spinner" aria-hidden="true"></div>
        <button class="sp-bigplay" type="button" aria-label="${t('player.play')}">${icon('play')}</button>
        <div class="sp-flash" aria-hidden="true"></div>
        <div class="sp-message" role="alert" hidden></div>
      </div>
      <div class="sp-controls" dir="ltr">
        <div class="sp-timeline" role="slider" tabindex="0" aria-label="${t('player.timeline')}" aria-valuemin="0" aria-valuenow="0">
          <div class="sp-track">
            <div class="sp-buffered"></div>
            <div class="sp-progress"></div>
            <div class="sp-markers"></div>
          </div>
          <div class="sp-thumb"></div>
          <div class="sp-hover" dir="${dir}"><b class="sp-hover-time"></b><span class="sp-hover-verse" lang="fa"></span></div>
        </div>
        <div class="sp-bar">
          <div class="sp-group">
            <button type="button" class="sp-btn" data-act="toggle" aria-label="${t('player.play')}">${icon('play')}</button>
            <button type="button" class="sp-btn" data-act="back" aria-label="${t('player.back10')}" title="${t('player.back10')} (J)">${skipIcon(-1, num(10))}</button>
            <button type="button" class="sp-btn" data-act="fwd" aria-label="${t('player.fwd10')}" title="${t('player.fwd10')} (L)">${skipIcon(1, num(10))}</button>
            <div class="sp-volume">
              <button type="button" class="sp-btn" data-act="mute" aria-label="${t('player.mute')}" title="${t('player.mute')} (M)">${icon('volume')}</button>
              <input class="sp-volume-range" type="range" min="0" max="1" step="0.05" aria-label="${t('player.volume')}">
            </div>
            <span class="sp-time"><span class="sp-cur">${formatTime(0)}</span><span class="sp-sep">/</span><span class="sp-dur">${formatTime(0)}</span></span>
          </div>
          <div class="sp-group sp-versenav" hidden>
            <button type="button" class="sp-btn" data-act="prevVerse" aria-label="${t('player.prevVerse')}" title="${t('player.prevVerse')} (P)">${icon('prev')}</button>
            <span class="sp-verse-chip" dir="${dir}"></span>
            <button type="button" class="sp-btn" data-act="nextVerse" aria-label="${t('player.nextVerse')}" title="${t('player.nextVerse')} (N)">${icon('next')}</button>
          </div>
          <div class="sp-group">
            <button type="button" class="sp-btn" data-act="captions" aria-pressed="false" aria-label="${t('player.captions')}" title="${t('player.captions')} (C)">${icon('captions')}</button>
            <div class="sp-menu-wrap">
              <button type="button" class="sp-btn sp-text-btn" data-act="speed" aria-haspopup="true" aria-label="${t('player.speed')}" title="${t('player.speed')}"></button>
              <div class="sp-menu" data-menu="speed" role="menu" dir="${dir}" hidden></div>
            </div>
            <div class="sp-menu-wrap">
              <button type="button" class="sp-btn sp-text-btn" data-act="quality" aria-haspopup="true" aria-label="${t('player.quality')}" title="${t('player.quality')}" hidden></button>
              <div class="sp-menu" data-menu="quality" role="menu" dir="${dir}" hidden></div>
            </div>
            <button type="button" class="sp-btn" data-act="pip" aria-label="${t('player.pip')}" title="${t('player.pip')}">${icon('pip')}</button>
            <button type="button" class="sp-btn" data-act="panel" aria-pressed="true" aria-label="${t('player.panel')}" title="${t('player.panel')} (B)">${icon('list')}</button>
            <button type="button" class="sp-btn" data-act="fullscreen" aria-label="${t('player.fullscreen')}" title="${t('player.fullscreen')} (F)">${icon('fullscreen')}</button>
          </div>
        </div>
      </div>
      <div class="sp-embedbar" hidden>
        <span class="sp-embedbar-actions sp-versenav" dir="ltr" hidden>
          <button type="button" class="sp-btn" data-act="prevVerse" aria-label="${t('player.prevVerse')}" title="${t('player.prevVerse')}">${icon('prev')}</button>
          <span class="sp-verse-chip" dir="${dir}"></span>
          <button type="button" class="sp-btn" data-act="nextVerse" aria-label="${t('player.nextVerse')}" title="${t('player.nextVerse')}">${icon('next')}</button>
        </span>
        <span class="sp-embedbar-text"></span>
        <span class="sp-embedbar-actions">
          <a class="sp-btn" data-embed-link target="_blank" rel="noopener" aria-label="${t('player.openAparat')}" title="${t('player.openAparat')}">${icon('external')}</a>
          <button type="button" class="sp-btn" data-act="panel" aria-pressed="true" aria-label="${t('player.panel')}" title="${t('player.panel')}">${icon('list')}</button>
          <button type="button" class="sp-btn" data-act="fullscreen" aria-label="${t('player.fullscreen')}" title="${t('player.fullscreen')}">${icon('fullscreen')}</button>
        </span>
      </div>`;

    const $ = (s) => r.querySelector(s);
    this.video = $('.sp-video');
    this.embedBox = $('.sp-embed');
    this.caption = $('.sp-caption');
    this.flashEl = $('.sp-flash');
    this.messageEl = $('.sp-message');
    this.timeline = $('.sp-timeline');
    this.track = $('.sp-track');
    this.bufferedEl = $('.sp-buffered');
    this.progressEl = $('.sp-progress');
    this.markersEl = $('.sp-markers');
    this.thumb = $('.sp-thumb');
    this.hoverEl = $('.sp-hover');
    this.curEl = $('.sp-cur');
    this.durEl = $('.sp-dur');
    this.volumeRange = $('.sp-volume-range');
    this.verseNavs = [...r.querySelectorAll('.sp-versenav')];
    this.verseChips = [...r.querySelectorAll('.sp-verse-chip')];
    this.speedBtn = $('[data-act="speed"]');
    this.qualityBtn = $('[data-act="quality"]');
    this.speedMenu = $('[data-menu="speed"]');
    this.qualityMenu = $('[data-menu="quality"]');
    this.embedBar = $('.sp-embedbar');

    const vol = store.get('player:volume', 1);
    this.video.volume = clamp(Number(vol) || 1, 0, 1);
    this.video.muted = store.get('player:muted', false);
    this.volumeRange.value = this.video.muted ? 0 : this.video.volume;
    this.updateVolumeIcon();
    this.updateCaptionsBtn();

    if (!document.pictureInPictureEnabled) r.querySelector('[data-act="pip"]').hidden = true;
    this.renderSpeedMenu();
  }

  // ---------- رویدادها ----------

  bind() {
    const v = this.video;
    const r = this.root;

    r.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (btn && r.contains(btn)) this.action(btn.dataset.act, btn);
      else if (!e.target.closest('.sp-menu-wrap')) this.closeMenus();
    });

    // کلیک روی تصویر: پخش/توقف — دوبار کلیک: تمام‌صفحه
    const screen = r.querySelector('.sp-screen');
    let clickTimer;
    screen.addEventListener('click', (e) => {
      if (this.mode !== 'video' || e.target.closest('button')) return;
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => this.toggle(true), 200);
    });
    screen.addEventListener('dblclick', (e) => {
      if (this.mode !== 'video' || e.target.closest('button')) return;
      clearTimeout(clickTimer);
      this.toggleFullscreen();
    });
    r.querySelector('.sp-bigplay').addEventListener('click', (e) => {
      e.stopPropagation();
      this.play();
    });

    v.addEventListener('play', () => this.onPlayState());
    v.addEventListener('pause', () => this.onPlayState());
    v.addEventListener('ended', () => this.onPlayState());
    v.addEventListener('waiting', () => r.classList.add('sp-loading'));
    v.addEventListener('seeking', () => r.classList.add('sp-loading'));
    for (const ev of ['playing', 'canplay', 'seeked', 'pause']) v.addEventListener(ev, () => r.classList.remove('sp-loading'));
    v.addEventListener('progress', () => this.renderBuffered());
    v.addEventListener('timeupdate', () => this.tick());
    v.addEventListener('ratechange', () => this.renderSpeedMenu());
    v.addEventListener('volumechange', () => {
      this.updateVolumeIcon();
      store.set('player:volume', v.volume);
      store.set('player:muted', v.muted);
    });
    v.addEventListener('loadedmetadata', () => {
      this.durEl.textContent = formatTime(this.duration);
      this.timeline.setAttribute('aria-valuemax', String(Math.floor(this.duration)));
      this.renderMarkers();
      this.dispatchEvent(new CustomEvent('loaded', { detail: { duration: this.duration } }));
    });
    v.addEventListener('error', () => this.onSourceError());

    this.volumeRange.addEventListener('input', () => {
      v.volume = Number(this.volumeRange.value);
      v.muted = v.volume === 0;
    });

    this.bindTimeline();

    // پنهان‌شدن خودکار کنترل‌ها هنگام پخش
    let idleTimer;
    const wake = () => {
      r.classList.remove('sp-idle');
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (!v.paused && !this.dragging && !r.querySelector('.sp-menu:not([hidden])')) r.classList.add('sp-idle');
      }, IDLE_MS);
    };
    r.addEventListener('pointermove', wake);
    r.addEventListener('pointerdown', wake);
    r.addEventListener('focusin', wake);
    r.addEventListener('pointerleave', () => {
      if (!v.paused) r.classList.add('sp-idle');
    });
    this.wake = wake;

    document.addEventListener('fullscreenchange', () => this.onFullscreenChange());
    document.addEventListener('webkitfullscreenchange', () => this.onFullscreenChange());
  }

  bindTimeline() {
    const tl = this.timeline;
    const ratioAt = (clientX) => {
      const rect = this.track.getBoundingClientRect();
      return clamp((clientX - rect.left) / rect.width, 0, 1);
    };
    const showHover = (ratio) => {
      const d = this.duration;
      if (!d) return;
      const at = ratio * d;
      this.hoverEl.querySelector('.sp-hover-time').textContent = formatTime(at);
      const i = this.markerIndexAt(at);
      const m = this.markers[i];
      this.hoverEl.querySelector('.sp-hover-verse').textContent = m ? `${t('player.verse', { i: m.index + 1 })}: ${m.title}` : '';
      const rect = this.track.getBoundingClientRect();
      const w = this.hoverEl.offsetWidth || 160;
      const x = clamp(ratio * rect.width, w / 2, rect.width - w / 2);
      this.hoverEl.style.left = `${x}px`;
      tl.classList.add('sp-hovering');
    };

    tl.addEventListener('pointermove', (e) => {
      const ratio = ratioAt(e.clientX);
      showHover(ratio);
      if (this.dragging) this.renderProgress(ratio);
    });
    tl.addEventListener('pointerleave', () => {
      if (!this.dragging) tl.classList.remove('sp-hovering');
    });
    tl.addEventListener('pointerdown', (e) => {
      if (this.mode !== 'video' || !this.duration) return;
      this.dragging = true;
      tl.setPointerCapture(e.pointerId);
      tl.classList.add('sp-dragging');
      const ratio = ratioAt(e.clientX);
      this.renderProgress(ratio);
      showHover(ratio);
    });
    const end = (e) => {
      if (!this.dragging) return;
      this.dragging = false;
      tl.classList.remove('sp-dragging', 'sp-hovering');
      this.seek(ratioAt(e.clientX) * this.duration);
    };
    tl.addEventListener('pointerup', end);
    tl.addEventListener('pointercancel', () => {
      this.dragging = false;
      tl.classList.remove('sp-dragging', 'sp-hovering');
    });
    tl.addEventListener('keydown', (e) => {
      if (e.code === 'ArrowRight') this.seekBy(5);
      else if (e.code === 'ArrowLeft') this.seekBy(-5);
      else if (e.code === 'Home') this.seek(0);
      else if (e.code === 'End') this.seek(this.duration - 1);
      else return;
      e.preventDefault();
      e.stopPropagation();
    });
  }

  onKey(e) {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const el = e.target;
    if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
    if (this.mode === 'idle') return;
    if (this.mode === 'embed' && !['KeyB', 'KeyF', 'KeyN', 'KeyP'].includes(e.code)) return;
    const v = this.video;
    switch (e.code) {
      case 'Space':
        if (el && (el.tagName === 'BUTTON' || el.tagName === 'A')) return;
        this.toggle(true);
        break;
      case 'KeyK':
        this.toggle(true);
        break;
      case 'ArrowRight':
        this.seekBy(5);
        break;
      case 'ArrowLeft':
        this.seekBy(-5);
        break;
      case 'KeyL':
        this.seekBy(10);
        break;
      case 'KeyJ':
        this.seekBy(-10);
        break;
      case 'ArrowUp':
        v.muted = false;
        v.volume = clamp(v.volume + 0.1, 0, 1);
        this.volumeRange.value = v.volume;
        this.flash(percent(v.volume));
        break;
      case 'ArrowDown':
        v.volume = clamp(v.volume - 0.1, 0, 1);
        this.volumeRange.value = v.volume;
        this.flash(percent(v.volume));
        break;
      case 'KeyM':
        this.action('mute');
        break;
      case 'KeyF':
        this.toggleFullscreen();
        break;
      case 'KeyC':
        this.action('captions');
        break;
      case 'KeyB':
        this.action('panel');
        break;
      case 'KeyN':
        this.gotoVerse(+1);
        break;
      case 'KeyP':
        this.gotoVerse(-1);
        break;
      default:
        return;
    }
    e.preventDefault();
    this.wake?.();
  }

  action(act, btn) {
    const v = this.video;
    switch (act) {
      case 'toggle':
        return this.toggle(true);
      case 'back':
        return this.seekBy(-10);
      case 'fwd':
        return this.seekBy(10);
      case 'mute':
        v.muted = !v.muted;
        if (!v.muted && v.volume === 0) v.volume = 0.6;
        this.volumeRange.value = v.muted ? 0 : v.volume;
        return;
      case 'captions':
        this.captionsOn = !this.captionsOn;
        store.set('player:captions', this.captionsOn);
        this.updateCaptionsBtn();
        this.renderCaption();
        return this.flash(t(this.captionsOn ? 'player.captionsOn' : 'player.captionsOff'));
      case 'speed':
      case 'quality': {
        const menu = act === 'speed' ? this.speedMenu : this.qualityMenu;
        const open = menu.hidden;
        this.closeMenus();
        menu.hidden = !open;
        btn?.setAttribute('aria-expanded', String(open));
        return;
      }
      case 'setSpeed':
        v.playbackRate = Number(btn.dataset.value);
        store.set('player:speed', v.playbackRate);
        return this.closeMenus();
      case 'setQuality':
        this.switchSource(Number(btn.dataset.value));
        return this.closeMenus();
      case 'pip':
        if (document.pictureInPictureElement) return document.exitPictureInPicture().catch(() => {});
        return v.requestPictureInPicture?.().catch(() => {});
      case 'panel':
        return this.dispatchEvent(new CustomEvent('panel'));
      case 'fullscreen':
        return this.toggleFullscreen();
      case 'prevVerse':
        return this.gotoVerse(-1);
      case 'nextVerse':
        return this.gotoVerse(+1);
    }
  }

  // ---------- بارگذاری ----------

  /** sources: [{label, height, url}] — به ترتیب کیفیت نزولی */
  loadVideo({ sources, poster = '', startAt = 0, autoplay = false, duration = 0 }) {
    this.teardownEmbed();
    this.mode = 'video';
    this.root.dataset.mode = 'video';
    this.hideMessage();
    this.sources = sources.slice();
    this.durationHint = duration;
    const prefHeight = store.get('player:quality', 720);
    let idx = this.sources.findIndex((s) => s.height && s.height <= prefHeight);
    if (idx < 0) idx = this.sources.length - 1;
    this.sourceIndex = Math.max(0, idx);
    this.video.poster = poster || '';
    this.video.playbackRate = store.get('player:speed', 1);
    this.pendingStart = startAt;
    this.pendingAutoplay = autoplay;
    this.video.src = this.sources[this.sourceIndex].url;
    this.video.addEventListener(
      'loadedmetadata',
      () => {
        this.video.playbackRate = store.get('player:speed', 1);
        if (this.pendingStart > 0) this.video.currentTime = Math.min(this.pendingStart, this.duration - 0.5);
        if (this.pendingAutoplay) this.play();
      },
      { once: true }
    );
    this.renderQualityMenu();
    this.renderMarkers();
    this.tick(true);
  }

  /** پخش از طریق iframe آپارات؛ پرش زمانی با پارامتر startTime انجام می‌شود */
  loadEmbed({ url, startAt = 0, autoplay = false, duration = 0, note = '', pageUrl = '' }) {
    this.video.pause();
    this.video.removeAttribute('src');
    this.video.load();
    this.mode = 'embed';
    this.root.dataset.mode = 'embed';
    this.embedBase = url;
    this.durationHint = duration;
    this.embedBox.hidden = false;
    this.embedBar.hidden = false;
    this.embedBar.querySelector('.sp-embedbar-text').textContent =
      note || t('watch.embedNote');
    const link = this.embedBar.querySelector('[data-embed-link]');
    link.hidden = !pageUrl;
    if (pageUrl) link.href = pageUrl;
    this.setEmbedTime(startAt, autoplay);
  }

  setEmbedTime(at, autoplay) {
    const u = new URL(this.embedBase);
    if (at > 0) u.searchParams.set('startTime', String(Math.floor(at)));
    if (autoplay) u.searchParams.set('autoplay', 'true');
    const frame = h('iframe', {
      src: u.toString(),
      title: t('player.aparatFrame'),
      allow: 'autoplay; fullscreen; picture-in-picture; encrypted-media',
      allowfullscreen: true,
      loading: 'eager',
    });
    this.embedBox.replaceChildren(frame);
    this.embedTime = at;
    this.lastTime = -1;
    this.emitTime(at);
  }

  teardownEmbed() {
    this.embedBox.replaceChildren();
    this.embedBox.hidden = true;
    this.embedBar.hidden = true;
  }

  switchSource(index) {
    if (index === this.sourceIndex || !this.sources[index]) return;
    const at = this.video.currentTime;
    const wasPlaying = !this.video.paused;
    this.sourceIndex = index;
    if (this.sources[index].height) store.set('player:quality', this.sources[index].height);
    this.pendingStart = at;
    this.pendingAutoplay = wasPlaying;
    this.video.src = this.sources[index].url;
    this.video.addEventListener(
      'loadedmetadata',
      () => {
        this.video.currentTime = this.pendingStart;
        this.video.playbackRate = store.get('player:speed', 1);
        if (this.pendingAutoplay) this.play();
      },
      { once: true }
    );
    this.renderQualityMenu();
    this.flash(this.sources[index].label);
  }

  onSourceError() {
    if (this.mode !== 'video' || !this.video.getAttribute('src')) return;
    const next = this.sourceIndex + 1;
    if (next < this.sources.length) {
      this.sourceIndex = next;
      this.video.src = this.sources[next].url;
      this.renderQualityMenu();
      return;
    }
    const error = this.video.error;
    this.dispatchEvent(new CustomEvent('fatal', { detail: { error }, cancelable: true }));
  }

  // ---------- کنترل پخش ----------

  get duration() {
    const d = this.video.duration;
    return Number.isFinite(d) && d > 0 ? d : this.durationHint || 0;
  }

  get currentTime() {
    return this.mode === 'embed' ? this.embedTime || 0 : this.video.currentTime;
  }

  get canSync() {
    return this.mode === 'video';
  }

  play() {
    if (this.mode !== 'video') return;
    const p = this.video.play();
    p?.catch(() => {
      /* مرورگر پخش خودکار را مسدود کرد — دکمه‌ی پخش می‌ماند */
    });
  }

  pause() {
    if (this.mode === 'video') this.video.pause();
  }

  toggle(withFlash) {
    if (this.mode !== 'video') return;
    if (this.video.paused || this.video.ended) this.play();
    else this.pause();
    if (withFlash) this.flash(this.video.paused ? icon('pause') : icon('play'), true);
  }

  seek(at, { play = false } = {}) {
    if (this.mode === 'embed') return this.setEmbedTime(Math.max(0, at), true);
    if (this.mode !== 'video') return;
    const d = this.duration;
    const target = clamp(at, 0, d ? d - 0.05 : at);
    if (this.video.readyState < HTMLMediaElement.HAVE_METADATA) {
      // پیش از آماده شدن متادیتا، پرش در loadedmetadata اعمال می‌شود
      this.pendingStart = target;
      if (play) this.pendingAutoplay = true;
    }
    this.video.currentTime = target;
    this.emitTime(target);
    this.renderProgress();
    if (play) this.play();
  }

  seekBy(delta) {
    if (this.mode !== 'video') return;
    this.seek(this.video.currentTime + delta);
    this.flash(t(delta > 0 ? 'player.seekFwd' : 'player.seekBack', { n: Math.abs(delta) }));
  }

  // ---------- بیت‌ها روی خط زمان ----------

  /**
   * markers: [{t, index, title, m1, m2, text}] — به ترتیبِ ابیاتِ شعر (index = شماره‌ی بیت از صفر).
   * زمان‌ها لازم نیست صعودی باشند؛ مثلاً شرحِ بیتِ اول بعد از خوانشِ کلِ غزل می‌آید.
   */
  setMarkers(markers, total = markers.length) {
    this.markers = markers.map((m, i) => ({ ...m, index: m.index ?? i })).filter((m) => Number.isFinite(m.t));
    this.totalVerses = total;
    for (const n of this.verseNavs) n.hidden = !this.markers.length;
    this.activeMarker = -2; // اجبار به نوشتن دوباره‌ی برچسبِ بیت
    this.renderMarkers();
    this.tick(true);
    if (this.mode === 'embed') this.emitTime(this.currentTime);
  }

  /** بیتی که آخرین بار پیش از این لحظه شروع شده است */
  markerIndexAt(at) {
    let idx = -1;
    for (let i = 0; i < this.markers.length; i++) {
      const m = this.markers[i];
      if (m.t <= at + 0.05 && (idx < 0 || m.t >= this.markers[idx].t)) idx = i;
    }
    return idx;
  }

  /** بیتِ قبل و بعد، به ترتیبِ شعر */
  gotoVerse(dir) {
    if (!this.markers.length) return;
    const at = this.currentTime;
    const byIndex = this.markers.slice().sort((a, b) => a.index - b.index);
    const cur = this.markers[this.markerIndexAt(at)];
    let pos = cur ? byIndex.indexOf(cur) : -1;
    if (dir < 0) {
      // اگر چند ثانیه از شروع بیت گذشته، به ابتدای همان بیت برگرد
      if (!(cur && at - cur.t > 2.5)) pos -= 1;
      pos = Math.max(0, pos);
    } else {
      pos = Math.min(byIndex.length - 1, pos + 1);
    }
    const target = byIndex[pos];
    this.seek(target.t, { play: true });
    this.dispatchEvent(new CustomEvent('verse', { detail: { index: target.index } }));
  }

  renderMarkers() {
    const d = this.duration;
    this.markersEl.replaceChildren(
      ...(d
        ? this.markers
            .filter((m) => m.t > 0 && m.t < d)
            .map((m) => h('i', { class: 'sp-marker', style: `left:${(m.t / d) * 100}%` }))
        : [])
    );
  }

  // ---------- به‌روزرسانی نمایش ----------

  onPlayState() {
    const playing = !this.video.paused && !this.video.ended;
    this.root.dataset.state = playing ? 'playing' : 'paused';
    const btn = this.root.querySelector('.sp-controls [data-act="toggle"]');
    btn.innerHTML = icon(playing ? 'pause' : 'play');
    btn.setAttribute('aria-label', t(playing ? 'player.pause' : 'player.play'));
    if (playing) this.loop();
    else this.root.classList.remove('sp-idle');
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    this.dispatchEvent(new CustomEvent('statechange', { detail: { playing } }));
  }

  loop() {
    cancelAnimationFrame(this.raf);
    const step = () => {
      this.tick();
      if (!this.video.paused && !this.video.ended) this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  tick(force) {
    if (this.mode !== 'video') return;
    const t = this.video.currentTime;
    if (!force && Math.abs(t - this.lastTime) < 0.04) return;
    if (!this.dragging) this.renderProgress();
    this.emitTime(t);
  }

  emitTime(at) {
    this.lastTime = at;
    this.curEl.textContent = formatTime(at);
    this.timeline.setAttribute('aria-valuenow', String(Math.floor(at)));
    this.timeline.setAttribute('aria-valuetext', formatTime(at));
    const i = this.markerIndexAt(at);
    if (i !== this.activeMarker) {
      this.activeMarker = i;
      const m = this.markers[i];
      const label = m ? t('player.verseOf', { i: m.index + 1, n: this.totalVerses }) : t('player.beforeVerses');
      for (const c of this.verseChips) c.textContent = label;
      this.renderCaption();
    }
    this.dispatchEvent(new CustomEvent('timeupdate', { detail: { time: at } }));
  }

  renderProgress(ratio) {
    const d = this.duration;
    const r = ratio ?? (d ? this.video.currentTime / d : 0);
    const pct = `${clamp(r, 0, 1) * 100}%`;
    this.progressEl.style.width = pct;
    this.thumb.style.left = pct;
  }

  renderBuffered() {
    const v = this.video;
    const d = this.duration;
    if (!d || !v.buffered.length) return;
    let end = 0;
    for (let i = 0; i < v.buffered.length; i++) {
      if (v.buffered.start(i) <= v.currentTime + 0.5) end = Math.max(end, v.buffered.end(i));
    }
    this.bufferedEl.style.width = `${(end / d) * 100}%`;
  }

  renderCaption() {
    const m = this.markers[this.activeMarker];
    const show = this.captionsOn && this.mode === 'video' && m;
    this.caption.hidden = !show;
    if (!show) return;
    this.caption.querySelector('.sp-cap-m1').textContent = m.text || m.m1 || '';
    this.caption.querySelector('.sp-cap-m2').textContent = m.text ? '' : m.m2 || '';
  }

  updateCaptionsBtn() {
    this.root.querySelector('[data-act="captions"]').setAttribute('aria-pressed', String(this.captionsOn));
  }

  updateVolumeIcon() {
    const v = this.video;
    const muted = v.muted || v.volume === 0;
    const btn = this.root.querySelector('[data-act="mute"]');
    btn.innerHTML = icon(muted ? 'muted' : 'volume');
    btn.setAttribute('aria-label', t(muted ? 'player.unmute' : 'player.mute'));
  }

  renderSpeedMenu() {
    const rate = this.video.playbackRate || 1;
    this.speedBtn.textContent = `${num(rate)}×`;
    this.speedMenu.replaceChildren(
      h('div', { class: 'sp-menu-title' }, t('player.speed')),
      ...SPEEDS.map((s) =>
        h(
          'button',
          { type: 'button', role: 'menuitemradio', 'aria-checked': String(s === rate), 'data-act': 'setSpeed', 'data-value': s },
          s === 1 ? t('player.normal') : `${num(s)}×`
        )
      )
    );
  }

  renderQualityMenu() {
    const many = this.sources.length > 1;
    this.qualityBtn.hidden = !many;
    if (!many) return;
    const cur = this.sources[this.sourceIndex];
    this.qualityBtn.textContent = cur.height ? num(cur.height) + 'p' : cur.label;
    this.qualityMenu.replaceChildren(
      h('div', { class: 'sp-menu-title' }, t('player.quality')),
      ...this.sources.map((s, i) =>
        h(
          'button',
          { type: 'button', role: 'menuitemradio', 'aria-checked': String(i === this.sourceIndex), 'data-act': 'setQuality', 'data-value': i },
          s.height ? num(s.height) + 'p' : s.label,
          s.height >= 720 ? h('small', {}, 'HD') : null
        )
      )
    );
  }

  closeMenus() {
    for (const m of this.root.querySelectorAll('.sp-menu')) m.hidden = true;
    for (const b of this.root.querySelectorAll('[aria-expanded]')) b.setAttribute('aria-expanded', 'false');
  }

  flash(content, isIcon) {
    const el = this.flashEl;
    el.innerHTML = isIcon ? content : '';
    if (!isIcon) el.textContent = content;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  showMessage(text) {
    this.messageEl.textContent = text;
    this.messageEl.hidden = false;
  }

  hideMessage() {
    this.messageEl.hidden = true;
  }

  setPanelState(open) {
    for (const b of this.root.querySelectorAll('[data-act="panel"]')) b.setAttribute('aria-pressed', String(open));
  }

  // ---------- تمام‌صفحه ----------

  toggleFullscreen() {
    const doc = document;
    const fsEl = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (fsEl) return (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc);
    const target = this.fsTarget;
    const req = target.requestFullscreen || target.webkitRequestFullscreen;
    if (req) return req.call(target).catch?.(() => {});
    // iOS: فقط خود ویدیو تمام‌صفحه می‌شود
    this.video.webkitEnterFullscreen?.();
  }

  onFullscreenChange() {
    const on = !!(document.fullscreenElement || document.webkitFullscreenElement);
    for (const b of this.root.querySelectorAll('[data-act="fullscreen"]')) {
      b.innerHTML = icon(on ? 'fullscreenExit' : 'fullscreen');
      b.setAttribute('aria-label', t(on ? 'player.exitFullscreen' : 'player.fullscreen'));
    }
    this.renderMarkers();
  }

  // ---------- Media Session (کنترل از قفل صفحه/هدفون) ----------

  setMeta({ title, artist, album, artwork }) {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album,
        artwork: artwork ? [{ src: artwork, sizes: '1280x720' }] : [],
      });
      const ms = navigator.mediaSession;
      ms.setActionHandler('play', () => this.play());
      ms.setActionHandler('pause', () => this.pause());
      ms.setActionHandler('seekbackward', () => this.seekBy(-10));
      ms.setActionHandler('seekforward', () => this.seekBy(10));
      ms.setActionHandler('previoustrack', () => this.gotoVerse(-1));
      ms.setActionHandler('nexttrack', () => this.gotoVerse(+1));
    } catch {
      /* پشتیبانی ناقص مرورگر */
    }
  }
}
