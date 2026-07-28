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
    document.querySelectorAll('[data-reclaim-message]').forEach(el => el.remove());
    if (document.body.dataset.reclaimBodyOverflow !== undefined) {
      document.body.style.overflow = document.body.dataset.reclaimBodyOverflow;
      delete document.body.dataset.reclaimBodyOverflow;
    }
    document.querySelectorAll('[data-reclaim-scroll]').forEach(el => {
      el.style.overflow = el.dataset.reclaimScroll;
      delete el.dataset.reclaimScroll;
    });
    const style = document.getElementById('reclaim-scroll-lock');
    if (style) style.remove();
  }

  let settings = (typeof DEFAULTS !== 'undefined') ? Object.assign({}, DEFAULTS) : {};
  if (typeof DEFAULTS === 'undefined') {
    console.error('[Reclaim] DEFAULTS not loaded. Check manifest js array order.');
  }
  let observer = null;
  let blocked = false;
  let lastApply = 0;

  function lockPage() {
    if (document.body.dataset.reclaimBodyOverflow === undefined) {
      document.body.dataset.reclaimBodyOverflow = document.body.style.overflow || '';
    }
    document.body.style.setProperty('overflow', 'hidden', 'important');
    document.documentElement.style.setProperty('overflow', 'hidden', 'important');
    if (!document.getElementById('reclaim-scroll-lock')) {
      const style = document.createElement('style');
      style.id = 'reclaim-scroll-lock';
      style.textContent = 'html, body { overflow: hidden !important; }';
      document.head.appendChild(style);
    }

  }

  const MOTIVATIONAL_MESSAGES = [
    "The algorithm wants your time. You want your future.",
    "Your goals are waiting. Keep scrolling? Nah, keep building.",
    "One more reel? Or one more step toward your dreams?",
    "Discipline is doing what needs to be done, even when you don't feel like it.",
    "Your future self is watching. Make them proud."
  ];

  function getRandomMessage() {
    return MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
  }

  function showFeedMessage(parent) {
    if (!parent || parent.querySelector('.ufyl-fb-msg')) return;
    const msg = document.createElement('div');
    msg.className = 'ufyl-fb-msg';
    msg.dataset.reclaimMessage = 'true';
    const content = document.createElement('div');
    content.style.cssText = 'padding:40px 20px;text-align:center;color:#8e8e8e;';
    const emoji = document.createElement('div');
    emoji.style.cssText = 'font-size:40px;margin-bottom:16px;';
    emoji.textContent = '🛑';
    const title = document.createElement('h3');
    title.style.cssText = 'color:#fafafa;margin-bottom:8px;font-size:16px;';
    title.textContent = 'Feed Hidden';
    const p = document.createElement('p');
    p.style.cssText = 'font-size:13px;margin-bottom:20px;';
    p.textContent = getRandomMessage();
    const a = document.createElement('a');
    a.href = '/messages/t/';
    a.style.cssText = 'display:inline-block;padding:10px 20px;background:linear-gradient(135deg,#0EA5A0,#5EEAD4);color:white;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;';
    a.textContent = '💬 Open Messages';
    content.append(emoji, title, p, a);
    msg.appendChild(content);
    parent.insertBefore(msg, parent.firstChild);
  }

  function blockHomeFeed() {
    if (!settings['facebook-home']) return;

    // Try [role="feed"] first, then fallback selectors
    const feed = document.querySelector('[role="feed"]');
    if (feed) {
      let column = feed.parentElement;
      while (column && column !== document.body && column.parentElement) {
        const p = column.parentElement;
        if (p === document.body || p.getAttribute('role') === 'main') {
          hide(column);
          lockPage();
          showFeedMessage(p);
          return;
        }
        column = p;
      }
      hide(feed);
      lockPage();
      showFeedMessage(feed.parentElement || document.body);
      return;
    }

    // Fallback: hide feed containers by data-pagelet
    let found = false;
    document.querySelectorAll(
      'div[data-pagelet^="MainFeed"], ' +
      'div[data-pagelet^="HomeFeed"], ' +
      'div[data-pagelet="FeedUnit"], ' +
      'div[data-pagelet^="Feed"]'
    ).forEach(el => { hide(el); lockPage(); found = true; });

    // Fallback: hide the main content column
    if (!found) {
      const mainEl = document.querySelector('[role="main"]');
      if (mainEl) {
        hide(mainEl);
        lockPage();
        showFeedMessage(mainEl.parentElement || document.body);
      }
    }
  }

  function blockFeed() {
    if (!settings['facebook-feed']) return;

    const feedContainer = document.querySelector('[role="feed"]');
    if (feedContainer) {
      let isInHidden = false;
      let p = feedContainer.parentElement;
      while (p && p !== document.body) {
        if (p.style.display === 'none') { isInHidden = true; break; }
        p = p.parentElement;
      }
      hide(feedContainer);
      lockPage();
      if (!isInHidden) {
        const parent = feedContainer.parentElement ||
                       document.querySelector('[role="main"], div[data-pagelet^="root"]') ||
                       document.body;
        showFeedMessage(parent);
      }
      return;
    }

    // Fallback: hide feed units by data-pagelet
    let found = false;
    document.querySelectorAll(
      'div[data-pagelet="FeedUnit"], ' +
      'div[data-pagelet^="Feed"], ' +
      'div[data-pagelet^="MainFeed"]'
    ).forEach(el => { hide(el); lockPage(); found = true; });

    if (found) {
      const parent = document.querySelector('[role="main"], div[data-pagelet^="root"]') || document.body;
      showFeedMessage(parent);
      return;
    }

    // Last resort: hide main content area
    const mainEl = document.querySelector('[role="main"]');
    if (mainEl) {
      hide(mainEl);
      lockPage();
      showFeedMessage(mainEl.parentElement || document.body);
    }
  }

  function blockReels() {
    if (!settings['facebook-reels']) return;

    document.querySelectorAll(
      'a[href*="reels"], a[href*="reel"], ' +
      '[aria-label*="Reels" i], ' +
      '[aria-label="Reels"], ' +
      '[aria-label="Reels on Facebook"], ' +
      '[data-pagelet*="Reel"]'
    ).forEach(el => {
      hide(el);
    });
    // Match nav items by text — only the Reels entry, not everything
    document.querySelectorAll('[role="navigation"] a, [role="navigation"] [role="button"]').forEach(el => {
      if (el.textContent.trim().toLowerCase() === 'reels') hide(el);
    });
  }

  function blockWatch() {
    if (!settings['facebook-watch']) return;

    document.querySelectorAll(
      'a[href="/watch/"], a[href="/watch"], ' +
      '[aria-label*="Watch" i], ' +
      '[data-pagelet*="Watch"]'
    ).forEach(el => {
      hide(el);
    });

    if (window.location.pathname.startsWith('/watch')) {
      window.location.href = '/messages/t/';
    }
  }

  function blockNotifications() {
    if (!settings['facebook-notifications']) return;

    document.querySelectorAll(
      'a[aria-label*="Notification" i], [aria-label="Notifications"], ' +
      'a[href*="/notifications"], ' +
      '[data-pagelet*="Notification"]'
    ).forEach(el => {
      hide(el);
    });
  }

  function blockStories() {
    if (!settings['facebook-stories']) return;

    document.querySelectorAll(
      '[data-pagelet="Stories"], ' +
      '[data-pagelet*="Story"], ' +
      '[aria-label*="story" i]'
    ).forEach(el => {
      hide(el);
    });
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

  function applyBlocks() {
    if (settings['extension-active'] === false || settings['facebook-enabled'] === false) return;
    const now = Date.now();
    if (now - lastApply < 200) return;
    lastApply = now;

    blockHomeFeed();
    blockFeed();
    blockReels();
    blockWatch();
    blockStories();
    blockNotifications();
    if (!blocked) { trackBlock(); blocked = true; }
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
      if (settings['extension-active'] === false || settings['facebook-enabled'] === false) {
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
    startTimeTracking('facebook');
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
    if (settings['extension-active'] === false || settings['facebook-enabled'] === false) {
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
    startTimeTracking('facebook');
    startPolling();
    observer = new MutationObserver(() => applyBlocks());
    observer.observe(document.documentElement, { childList: true, subtree: true });
  });

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'refreshSettings') {
      if (request.settings) settings = Object.assign({}, DEFAULTS, request.settings);
      if (settings['extension-active'] === false || settings['facebook-enabled'] === false) {
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
      startTimeTracking('facebook');
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
