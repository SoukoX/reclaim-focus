(function() {
  'use strict';

  const hiddenEls = new Set();
  const messageEls = new Set();

  function hide(el) {
    if (!el) return;
    if (el.style.getPropertyValue('display') === 'none') return;
    hiddenEls.add(el);
    el.style.setProperty('display', 'none', 'important');
  }

  function restoreBlocks() {
    hiddenEls.forEach(el => { if (el) el.style.removeProperty('display'); });
    hiddenEls.clear();
    messageEls.forEach(el => { if (el && el.parentNode) el.parentNode.removeChild(el); });
    messageEls.clear();
  }

  let settings = (typeof DEFAULTS !== 'undefined') ? Object.assign({}, DEFAULTS) : {};
  if (typeof DEFAULTS === 'undefined') {
    console.error('[Reclaim] DEFAULTS not loaded. Check manifest js array order.');
  }
  let observer = null;
  let blocked = false;

  const MOTIVATIONAL_MESSAGES = [
    "Your goals are waiting. Keep scrolling? Nah, keep building.",
    "One more reel? Or one more step toward your dreams?",
    "The algorithm wants your time. You want your future.",
    "Discipline is doing what needs to be done, even when you don't feel like it.",
    "Your future self is watching. Make them proud."
  ];

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

  function getRandomMessage() {
    return MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
  }

  function createBlockOverlay(message) {
    const overlay = document.createElement('div');
    overlay.className = 'ufyl-block-overlay';

    const content = document.createElement('div');
    content.className = 'ufyl-block-content';

    const icon = document.createElement('div');
    icon.className = 'ufyl-block-icon';
    icon.textContent = '🎯';

    const title = document.createElement('h3');
    title.textContent = 'Blocked by Reclaim';

    const p = document.createElement('p');
    p.textContent = message;

    const actions = document.createElement('div');
    actions.className = 'ufyl-block-actions';

    const btn1 = document.createElement('button');
    btn1.className = 'ufyl-btn ufyl-btn-primary';
    btn1.textContent = 'Got it, back to work';
    btn1.addEventListener('click', () => overlay.remove());

    const btn2 = document.createElement('button');
    btn2.className = 'ufyl-btn ufyl-btn-secondary';
    btn2.textContent = 'Go to Messages';
    btn2.addEventListener('click', () => { window.location.href = '/direct/inbox/'; });

    actions.append(btn1, btn2);
    content.append(icon, title, p, actions);
    overlay.appendChild(content);
    return overlay;
  }

  function blockFeed() {
    if (!settings['instagram-feed'] && !settings['instagram-reels'] && 
        !settings['instagram-explore'] && !settings['instagram-suggested'] && 
        !settings['instagram-notifications']) return;

    // Block main feed
    if (settings['instagram-feed']) {
      const feed = document.querySelector(
        'main[role="main"] > div > div:first-child > div:first-child, ' +
        'main[role="main"] section, ' +
        'article'
      );
      if (feed && !feed.querySelector('.ufyl-block-overlay')) {
        const posts = feed.querySelectorAll('article');
        posts.forEach((post, index) => {
          if (index > 0) {
            hide(post);
          }
        });

        // Add message after first post
        if (posts.length > 1 && !feed.querySelector('.ufyl-feed-message')) {
          const msg = document.createElement('div');
          msg.className = 'ufyl-feed-message';
          messageEls.add(msg);
          const wrap = document.createElement('div');
          wrap.style.cssText = 'padding:40px 20px;text-align:center;color:#8e8e8e;';
          const emoji = document.createElement('div');
          emoji.style.cssText = 'font-size:40px;margin-bottom:16px;';
          emoji.textContent = '🛑';
          const h3 = document.createElement('h3');
          h3.style.cssText = 'color:#fafafa;margin-bottom:8px;font-size:16px;';
          h3.textContent = 'Feed Hidden';
          const p = document.createElement('p');
          p.style.cssText = 'font-size:13px;margin-bottom:20px;';
          p.textContent = getRandomMessage();
          const a = document.createElement('a');
          a.href = '/direct/inbox/';
          a.style.cssText = 'display:inline-block;padding:10px 20px;background:linear-gradient(135deg,#0EA5A0,#5EEAD4);color:white;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;';
          a.textContent = '💬 Open Messages';
          wrap.append(emoji, h3, p, a);
          msg.appendChild(wrap);
          posts[0].parentNode.insertBefore(msg, posts[0].nextSibling);
        }
      }
    }

    // Block Reels tab, Explore — find nav links, exclude main content area
    const mainContent = document.querySelector('main[role="main"], section main');
    const feedContainer = document.querySelector('[role="feed"]');
    function isInMain(el) {
      return (mainContent && mainContent.contains(el)) || (feedContainer && feedContainer.contains(el));
    }
    function hideSidebarLink(hrefMatch, textMatches) {
      document.querySelectorAll('a, [role="link"], button, [role="button"]').forEach(el => {
        if (isInMain(el)) return;
        const href = el.getAttribute('href') || '';
        const text = el.textContent.trim().toLowerCase();
        if (href.includes(hrefMatch) || textMatches.some(m => text === m)) {
          hide(el);
        }
      });
    }
    if (settings['instagram-reels']) hideSidebarLink('/reels', ['reels']);
    if (settings['instagram-explore']) hideSidebarLink('/explore', ['explore', 'search & explore']);

    // Block Notifications — search all elements regardless of position
    if (settings['instagram-notifications']) {
      document.querySelectorAll('a, [role="link"], button, [role="button"], svg').forEach(el => {
        const href = el.getAttribute('href') || '';
        const text = el.textContent.trim().toLowerCase();
        const aria = el.getAttribute('aria-label') || '';
        if (href.includes('/activity') || href.includes('/notifications') ||
            text === 'notifications' || text === 'activity' ||
            aria === 'Activity' || aria === 'Notifications' ||
            aria.toLowerCase().includes('notification')) {
          const parent = el.closest('a, button, [role="link"], [role="button"]');
          hide(parent || el);
        }
      });
    }

    // Block suggested/follow suggestions — hide the entire right sidebar
    if (settings['instagram-suggested']) {
      // Find all "Suggested for you" elements on the RIGHT side of the screen
      let candidates = [];
      document.querySelectorAll('div, section').forEach(el => {
        if (el.offsetHeight < 50 || el.children.length < 2) return;
        const rect = el.getBoundingClientRect();
        if (rect.left < window.innerWidth * 0.5) return;
        if (el.textContent.toLowerCase().includes('suggested for you')) {
          candidates.push(el);
        }
      });
      // Hide the largest candidate (the sidebar container)
      candidates.sort((a, b) => (b.offsetWidth * b.offsetHeight) - (a.offsetWidth * a.offsetHeight));
      if (candidates.length > 0) {
        hide(candidates[0]);
      }
    }
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
      if (settings['extension-active'] === false || settings['instagram-enabled'] === false) {
        clearInterval(window.ufylPollInterval);
        window.ufylPollInterval = null;
        return;
      }
      blockFeed();
      if (!blocked) { trackBlock(); blocked = true; }
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
    blockFeed();
    if (!blocked) { trackBlock(); blocked = true; }
    startTimeTracking('instagram');
    startPolling();

    if (observer) observer.disconnect();
    observer = new MutationObserver(() => blockFeed());
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
        blockFeed();
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
    if (settings['extension-active'] === false || settings['instagram-enabled'] === false) {
      if (observer) observer.disconnect();
      if (window.ufylTimeInterval) clearInterval(window.ufylTimeInterval);
      if (window.ufylPollInterval) { clearInterval(window.ufylPollInterval); window.ufylPollInterval = null; }
      blocked = false;
      restoreBlocks();
      return;
    }
    if (observer) observer.disconnect();
    if (window.ufylPollInterval) { clearInterval(window.ufylPollInterval); window.ufylPollInterval = null; }
    restoreBlocks();
    blockFeed();
    if (!blocked) { blocked = true; }
    startPolling();
    observer = new MutationObserver(() => blockFeed());
    observer.observe(document.documentElement, { childList: true, subtree: true });
  });

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'refreshSettings') {
      if (request.settings) settings = Object.assign({}, DEFAULTS, request.settings);
      if (settings['extension-active'] === false || settings['instagram-enabled'] === false) {
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
      blockFeed();
      startTimeTracking('instagram');
      startPolling();
      observer = new MutationObserver(() => blockFeed());
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
