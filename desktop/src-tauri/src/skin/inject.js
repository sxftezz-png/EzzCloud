// EzzCloud — клиентская инъекция в страницы soundcloud.com.
// Цель: glassmorphism-скин, кастомный titlebar, скрытие промо/баннеров.
// Запускается один раз на старте webview (Tauri initialization_script).
// Дальнейшие SPA-навигации SoundCloud не пересоздают <body>, поэтому titlebar остаётся.

(function () {
  if (window.__EZZCLOUD_INJECTED) return;
  window.__EZZCLOUD_INJECTED = true;

  const ACCENT = '#ff5500';
  const ACCENT_HOVER = '#ff7733';

  /* ───────── CSS skin ───────── */
  const css = `
    :root {
      --ezz-accent: ${ACCENT};
      --ezz-accent-hover: ${ACCENT_HOVER};
      --ezz-bg: rgba(15, 15, 18, 0.72);
      --ezz-border: rgba(255, 255, 255, 0.06);
    }

    /* ───── Hide promo / upsell / ads ───── */
    .upsellBanner,
    .upsellModal,
    .upsell,
    [class*="ProUpsell"],
    [class*="upsellPro"],
    [class*="upsellGo"],
    [data-tracking-element*="pro_upsell"],
    a[href*="/pro"],
    a[href*="/go"],
    a[href*="/upsell"],
    .l-banner,
    .ad-banner,
    .adWrapper,
    .audibleAd,
    .visualAd,
    .header__topMenuPro,
    iframe[src*="googlesyndication"],
    iframe[src*="doubleclick"],
    iframe[src*="adsystem"] {
      display: none !important;
    }

    /* ───── Глобальный шрифт-сглаживание ───── */
    html, body {
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
    }

    /* ───── Сдвиг под наш titlebar ───── */
    body {
      padding-top: 36px !important;
    }

    /* ───── Glassmorphism главного header'а SC ───── */
    .header.l-fixed-top,
    #app > div > header,
    [class*="topbar__"],
    [class*="Header_"]:first-of-type {
      background: var(--ezz-bg) !important;
      backdrop-filter: blur(40px) saturate(180%) !important;
      -webkit-backdrop-filter: blur(40px) saturate(180%) !important;
      border-bottom: 1px solid var(--ezz-border) !important;
      box-shadow: 0 1px 0 rgba(0, 0, 0, 0.35) !important;
    }

    /* ───── Sidebar / left-nav glass ───── */
    .l-sidebar-left,
    [class*="sidebar__"],
    [class*="Sidebar_"] {
      background: rgba(20, 20, 24, 0.55) !important;
      backdrop-filter: blur(28px) saturate(160%) !important;
      -webkit-backdrop-filter: blur(28px) saturate(160%) !important;
      border-right: 1px solid var(--ezz-border) !important;
    }

    /* ───── Player bar внизу — glass ───── */
    .playControls,
    .playControls__inner,
    [class*="playControls__"],
    [class*="PlayerBar_"],
    [class*="PlaybarFooter_"] {
      background: rgba(15, 15, 18, 0.82) !important;
      backdrop-filter: blur(50px) saturate(180%) !important;
      -webkit-backdrop-filter: blur(50px) saturate(180%) !important;
      border-top: 1px solid var(--ezz-border) !important;
    }

    /* ───── Карточки треков ───── */
    .soundList__item,
    .stream__list .soundList__item,
    [class*="trackItem__"],
    [class*="streamItem"] {
      transition: background-color 0.2s ease !important;
      border-radius: 12px !important;
      margin-bottom: 4px !important;
    }
    .soundList__item:hover,
    [class*="trackItem__"]:hover {
      background: rgba(255, 255, 255, 0.04) !important;
    }

    /* ───── Кнопки play — оранжевая заливка ───── */
    .playButton,
    .sc-button-play,
    .playButton__icon::before {
      background-color: var(--ezz-accent) !important;
    }
    .playButton:hover,
    .sc-button-play:hover {
      background-color: var(--ezz-accent-hover) !important;
    }

    /* ───── Скроллбары ───── */
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.08);
      border-radius: 8px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.16);
    }

    /* ───── Selection ───── */
    ::selection {
      background: rgba(255, 85, 0, 0.35);
      color: #fff;
    }

    /* ───── Custom titlebar ───── */
    #ezz-titlebar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 36px;
      background: rgba(12, 12, 14, 0.92);
      backdrop-filter: blur(60px) saturate(180%);
      -webkit-backdrop-filter: blur(60px) saturate(180%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      padding: 0 0 0 14px;
      user-select: none;
      -webkit-user-select: none;
      color: #fff;
      font-family: -apple-system, "Segoe UI", system-ui, sans-serif;
      font-size: 12px;
      letter-spacing: -0.01em;
      box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04);
    }
    #ezz-titlebar .ezz-drag {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 10px;
      height: 100%;
      cursor: default;
    }
    #ezz-titlebar .ezz-logo {
      width: 18px;
      height: 18px;
      border-radius: 5px;
      background: linear-gradient(135deg, #ff5500 0%, #c83c00 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 800;
      font-size: 11px;
      box-shadow: 0 2px 8px rgba(255, 85, 0, 0.35);
    }
    #ezz-titlebar .ezz-name {
      font-weight: 700;
      color: rgba(255, 255, 255, 0.92);
    }
    #ezz-titlebar .ezz-tag {
      color: rgba(255, 255, 255, 0.32);
      font-size: 11px;
    }
    #ezz-titlebar .ezz-controls {
      display: flex;
      gap: 0;
      height: 100%;
      margin-left: 12px;
    }
    #ezz-titlebar .ezz-btn {
      width: 46px;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.55);
      cursor: pointer;
      transition: background-color 0.12s ease, color 0.12s ease;
      padding: 0;
    }
    #ezz-titlebar .ezz-btn svg {
      width: 12px;
      height: 12px;
    }
    #ezz-titlebar .ezz-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
    }
    #ezz-titlebar .ezz-btn-close:hover {
      background: #e81123;
      color: #fff;
    }
  `;

  const style = document.createElement('style');
  style.id = 'ezz-skin-style';
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  /* ───────── Titlebar ───────── */
  function mountTitlebar() {
    if (document.getElementById('ezz-titlebar')) return;
    if (!document.body) return;

    const tb = document.createElement('div');
    tb.id = 'ezz-titlebar';
    tb.innerHTML = `
      <div class="ezz-drag" data-tauri-drag-region>
        <div class="ezz-logo" data-tauri-drag-region>E</div>
        <div class="ezz-name" data-tauri-drag-region>EzzCloud</div>
        <div class="ezz-tag" data-tauri-drag-region>by @inkerow</div>
      </div>
      <div class="ezz-controls">
        <button class="ezz-btn" data-act="min" title="Свернуть">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 6h8"/></svg>
        </button>
        <button class="ezz-btn" data-act="max" title="Развернуть/Восстановить">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2.5" y="2.5" width="7" height="7" rx="0.5"/></svg>
        </button>
        <button class="ezz-btn ezz-btn-close" data-act="close" title="Закрыть">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7"/></svg>
        </button>
      </div>
    `;
    document.body.insertAdjacentElement('afterbegin', tb);

    tb.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;
      try {
        const tauriWin = window.__TAURI__?.window?.getCurrentWindow?.();
        if (!tauriWin) return;
        if (act === 'min') await tauriWin.minimize();
        else if (act === 'max') await tauriWin.toggleMaximize();
        else if (act === 'close') await tauriWin.close();
      } catch (err) {
        console.error('[ezzcloud] window action failed', err);
      }
    });
  }

  /* ───────── Защита: если SC снёс body / titlebar — перевешиваем ───────── */
  function ensureMounted() {
    mountTitlebar();
    if (!document.getElementById('ezz-skin-style')) {
      (document.head || document.documentElement).appendChild(style.cloneNode(true));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureMounted, { once: true });
  } else {
    ensureMounted();
  }

  // На SPA-роутах SC может перерисовать body
  const observer = new MutationObserver(() => ensureMounted());
  if (document.documentElement) {
    observer.observe(document.documentElement, { childList: true, subtree: false });
  }

  /* ───────── window.open shim: popup → redirect ───────── */
  // Tauri WebView2 не пускает popup-окна из коробки. SC OAuth (Google/Apple/
  // Facebook) использует window.open(...,'popup'). Делаем popup-style вызовы
  // обычным редиректом главного окна — большинство OAuth-провайдеров умеет
  // отрабатывать redirect-flow (после логина возвращают cookies на callback,
  // дальше SC сам подхватит сессию).
  const _origOpen = window.open ? window.open.bind(window) : null;
  const fakePopup = (url) => ({
    closed: false,
    close() {},
    focus() {},
    blur() {},
    postMessage() {},
    location: { href: url, replace(u) { window.location.href = u; } },
    document: null,
  });
  window.open = function (url, target, features) {
    if (!url) return _origOpen ? _origOpen(url, target, features) : null;
    const looksLikePopup =
      target === '_blank' ||
      target === 'oauth-popup' ||
      (typeof features === 'string' && /(width=|height=|popup)/i.test(features));

    const isOAuth =
      /accounts\.google\.com|facebook\.com\/(?:v\d+\/)?dialog|appleid\.apple\.com|github\.com\/login|api\.twitter\.com\/oauth/i.test(
        url,
      );

    if (looksLikePopup || isOAuth) {
      try {
        window.location.href = url;
      } catch {
        if (_origOpen) return _origOpen(url, target, features);
      }
      return fakePopup(url);
    }
    return _origOpen ? _origOpen(url, target, features) : null;
  };

  /* ───────── Dom-scrape: текущий трек для Discord/MediaSession ───────── */
  // Tauri-команд для discord_set_activity мы пока не дёргаем — у SC web уже
  // настроен MediaSession через Web Audio, OS его подхватит.
  // Discord RPC можно подключить позже через invoke('discord_set_activity').

  console.log('[ezzcloud] skin injected');
})();
