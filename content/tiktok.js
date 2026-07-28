(function() {
  'use strict';

  function hide(el) {
    if (!el) return;
    if (el.style.getPropertyValue('display') === 'none') return;
    el.dataset.reclaimHidden = 'true';
    el.style.setProperty('display', 'none', 'important');
  }

  function restoreBlocks() {
    document.querySelectorAll('[data-reclaim-hidden]').forEach(el => {
      el.style.display = '';
      delete el.dataset.reclaimHidden;
    });
    const overlay = document.getElementById('ufyl-tiktok-overlay');
    if (overlay) overlay.remove();
  }

  let settings = (typeof DEFAULTS !== 'undefined') ? Object.assign({}, DEFAULTS) : {};
  if (typeof DEFAULTS === 'undefined') {
    console.error('[Reclaim] DEFAULTS not loaded. Check manifest js array order.');
  }
  let observer = null;
  let blocked = false;

  const MESSAGES = [
    "The infinite scroll ends here. What were you planning to do?",
    "Your future self is watching. Make them proud.",
    "The algorithm wants your time. You want your future.",
    "One more video? Or one more step toward your dreams?"
  ];

  function getRandomMessage() {
    return MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  }

  function trackBlock() {
    chrome.storage.local.get(['blocks-today', 'time-saved', 'last-active', 'focus-streak'], (data) => {
      const now = Date.now();
      const today = new Date().toDateString();
      const lastActive = data['last-active'];
      const lastDate = lastActive ? new Date(lastActive).toDateString() : null;
      let streak = data['focus-streak'] || 0;
      if (lastDate !== today) {
        const yesterday = new Date(now - 86400000).toDateString();
        streak = lastDate === yesterday ? streak + 1 : 1;
      }
      chrome.storage.local.set({
        'blocks-today': (data['blocks-today'] || 0) + 1,
        'time-saved': (data['time-saved'] || 0) + 15,
        'last-active': now,
        'focus-streak': streak
      });
    });
  }

  function blockForYou() {
    if (!settings['tiktok-foryou']) return;

    const overlay = document.getElementById('ufyl-tiktok-overlay');

    // If not on feed page, clean up overlay
    if (window.location.pathname !== '/' && window.location.pathname !== '/foryou') {
      if (overlay) overlay.remove();
      return;
    }

    if (overlay) return;

    // Full-page overlay
    const newOverlay = document.createElement('div');
    newOverlay.id = 'ufyl-tiktok-overlay';
    newOverlay.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;' +
      'background:#000;pointer-events:none;' +
      'display:flex;align-items:center;justify-content:center;';

    const wrap = document.createElement('div');
    wrap.style.cssText =
      'pointer-events:auto;' +
      'text-align:center;color:#fff;font-family:sans-serif;padding:20px;max-width:400px;';
    const emoji = document.createElement('div');
    emoji.style.cssText = 'font-size:60px;margin-bottom:20px;';
    emoji.textContent = '🛑';
    const title = document.createElement('h3');
    title.style.cssText =
      'color:#fafafa;margin-bottom:12px;font-size:22px;font-weight:600;';
    title.textContent = 'Feed Hidden';
    const p = document.createElement('p');
    p.style.cssText =
      'color:#888;margin-bottom:24px;font-size:14px;line-height:1.5;';
    p.textContent = getRandomMessage();
    const btnWrap = document.createElement('div');
    btnWrap.style.cssText =
      'display:flex;gap:12px;justify-content:center;flex-wrap:wrap;';
    const msgBtn = document.createElement('a');
    msgBtn.href = '/messages';
    msgBtn.style.cssText =
      'padding:12px 24px;background:linear-gradient(135deg,#0EA5A0,#5EEAD4);' +
      'color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;';
    msgBtn.textContent = '💬 Open Messages';
    const uploadBtn = document.createElement('a');
    uploadBtn.href = '/upload';
    uploadBtn.style.cssText =
      'padding:12px 24px;background:#333;color:#fff;border-radius:8px;' +
      'text-decoration:none;font-weight:600;font-size:14px;';
    uploadBtn.textContent = '📤 Upload';
    btnWrap.append(msgBtn, uploadBtn);
    wrap.append(emoji, title, p, btnWrap);
    newOverlay.appendChild(wrap);
    document.body.appendChild(newOverlay);

    if (!blocked) { trackBlock(); blocked = true; }
  }

  function blockFollowing() {
    if (!settings['tiktok-following']) return;

    if (window.location.pathname === '/following') {
      document.querySelectorAll('[data-e2e="recommend-list"], [class*="FriendList"], [class*="FollowingContainer"]').forEach(el => hide(el));
    }

    document.querySelectorAll('a[href="/following"], [data-e2e="tab-following"]').forEach(el => hide(el));
  }

  function blockNotifications() {
    if (!settings['tiktok-notifications']) return;

    document.querySelectorAll('[data-e2e="notification-bell"], a[href*="/notifications"], svg[aria-label*="notification" i], [class*="Notification" i], [data-e2e="nav-notifications"]').forEach(el => {
      const parent = el.closest('a, button, div[role="button"]');
      if (parent) hide(parent);
      else hide(el);
    });
  }

  function blockDiscover() {
    if (!settings['tiktok-discover']) return;

    document.querySelectorAll('a[href="/discover"], a[href="/explore"], [data-e2e="discover"], [data-e2e="nav-discover"]').forEach(el => hide(el));

    if (window.location.pathname === '/discover' || window.location.pathname === '/explore') {
      window.location.href = '/messages';
    }
  }

  function blockSearch() {
    if (!settings['tiktok-search']) return;

    document.querySelectorAll(
      'a[href^="/search"], ' +
      '[data-e2e="search"], ' +
      '[data-e2e="nav-search"], ' +
      '[data-e2e="nav-search-icon"], ' +
      '[class*="Search" i]'
    ).forEach(el => {
      const parent = el.closest('a, button, div[role="button"]');
      if (parent) hide(parent);
      else hide(el);
    });

    if (window.location.pathname.startsWith('/search/')) {
      window.location.href = '/messages';
    }
  }

  function applyBlocks() {
    if (settings['extension-active'] === false || settings['tiktok-enabled'] === false) return;

    blockForYou();
    blockFollowing();
    blockDiscover();
    blockSearch();
    blockNotifications();
  }

  let timeAccum = 0;
  let timeTick = null;

  function startTimeTracking(platform) {
    function flush() {
      if (timeAccum > 0) {
        chrome.runtime.sendMessage({ action: 'addTime', platform, seconds: Math.round(timeAccum) });
        timeAccum = 0;
      }
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (timeTick) { timeAccum += (Date.now() - timeTick) / 1000; timeTick = null; }
        flush();
      } else {
        timeTick = Date.now();
      }
    });
    if (window.ufylTimeInterval) clearInterval(window.ufylTimeInterval);
    window.ufylTimeInterval = setInterval(() => {
      if (!document.hidden && timeTick) {
        timeAccum += (Date.now() - timeTick) / 1000;
        timeTick = Date.now();
        flush();
      }
    }, 5000);
    if (!document.hidden) timeTick = Date.now();
  }

  function startPolling() {
    let count = 0;
    function poll() {
      if (settings['extension-active'] === false || settings['tiktok-enabled'] === false) {
        clearInterval(window.ufylPollInterval);
        window.ufylPollInterval = null;
        return;
      }
      applyBlocks();
      count++;
    }
    clearInterval(window.ufylPollInterval);
    window.ufylPollInterval = setInterval(poll, 1000);
    setTimeout(() => {
      clearInterval(window.ufylPollInterval);
      window.ufylPollInterval = setInterval(poll, 3000);
    }, 30000);
  }

  function init() {
    applyBlocks();
    startTimeTracking('tiktok');
    startPolling();

    if (observer) observer.disconnect();
    observer = new MutationObserver(() => applyBlocks());
    observer.observe(document.documentElement, { childList: true, subtree: true });

    chrome.storage.local.get(null, (data) => {
      if (chrome.runtime.lastError) {
        console.warn('[Reclaim] storage read error:', chrome.runtime.lastError.message);
        return;
      }
      const merged = Object.assign({}, DEFAULTS, data);
      if (JSON.stringify(merged) !== JSON.stringify(settings)) {
        settings = merged;
        restoreBlocks();
        applyBlocks();
      }
    });
  }

  function reinit() {
    if (observer) observer.disconnect();
    if (window.ufylTimeInterval) clearInterval(window.ufylTimeInterval);
    if (window.ufylPollInterval) { clearInterval(window.ufylPollInterval); window.ufylPollInterval = null; }
    blocked = false;
    init();
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    Object.entries(changes).forEach(([k, v]) => {
      if (v.newValue !== undefined) settings[k] = v.newValue;
    });
    if (settings['extension-active'] === false || settings['tiktok-enabled'] === false) {
      if (observer) observer.disconnect();
      if (window.ufylTimeInterval) clearInterval(window.ufylTimeInterval);
      if (window.ufylPollInterval) { clearInterval(window.ufylPollInterval); window.ufylPollInterval = null; }
      blocked = false;
      restoreBlocks();
      return;
    }
    if (observer) observer.disconnect();
    if (window.ufylTimeInterval) clearInterval(window.ufylTimeInterval);
    if (window.ufylPollInterval) { clearInterval(window.ufylPollInterval); window.ufylPollInterval = null; }
    restoreBlocks();
    applyBlocks();
    startTimeTracking('tiktok');
    startPolling();
    observer = new MutationObserver(() => applyBlocks());
    observer.observe(document.documentElement, { childList: true, subtree: true });
  });

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'refreshSettings') {
      if (request.settings) settings = Object.assign({}, DEFAULTS, request.settings);
      if (settings['extension-active'] === false || settings['tiktok-enabled'] === false) {
        if (observer) observer.disconnect();
        if (window.ufylTimeInterval) clearInterval(window.ufylTimeInterval);
        if (window.ufylPollInterval) { clearInterval(window.ufylPollInterval); window.ufylPollInterval = null; }
        blocked = false;
        restoreBlocks();
        return;
      }
      if (observer) observer.disconnect();
      if (window.ufylTimeInterval) clearInterval(window.ufylTimeInterval);
      if (window.ufylPollInterval) { clearInterval(window.ufylPollInterval); window.ufylPollInterval = null; }
      restoreBlocks();
      applyBlocks();
      startTimeTracking('tiktok');
      startPolling();
      observer = new MutationObserver(() => applyBlocks());
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
