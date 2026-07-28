(function() {
  'use strict';

  function hide(el) {
    if (!el) return;
    if (el.style.getPropertyValue('display') === 'none') return;
    el.dataset.reclaimHidden = 'true';
    el.style.setProperty('display', 'none', 'important');
  }

  function replaceContent(el, newContent) {
    if (!el) return;
    el.replaceChildren(newContent);
  }

  function restoreBlocks() {
    document.querySelectorAll('[data-reclaim-hidden]').forEach(el => {
      el.style.display = '';
      delete el.dataset.reclaimHidden;
    });
    document.querySelectorAll('[data-reclaim-original]').forEach(el => {
      delete el.dataset.reclaimOriginal;
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
    ['reclaim-scroll-lock', 'reclaim-hide-shorts', 'reclaim-hide-home'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  let settings = (typeof DEFAULTS !== 'undefined') ? Object.assign({}, DEFAULTS) : {};
  if (typeof DEFAULTS === 'undefined') {
    console.error('[Reclaim] DEFAULTS not loaded. Check manifest js array order.');
  }
  let videoTimer = null;
  let videoStartTime = null;
  let currentVideoId = null;
  let observer = null;
  let overlayShown = false;

  const MOTIVATIONAL_QUOTES = [
    { text: "Your future self is watching you right now through memories.", author: "— You" },
    { text: "Discipline is choosing between what you want now and what you want most.", author: "— Abraham Lincoln" },
    { text: "The time will pass anyway. Use it wisely.", author: "— Earl Nightingale" },
    { text: "Small steps every day. That's the formula.", author: "— Unknown" },
    { text: "Your focus determines your reality.", author: "— George Lucas" },
    { text: "One hour of deep work beats 4 hours of distracted scrolling.", author: "— Cal Newport" },
    { text: "What you do today can improve all your tomorrows.", author: "— Ralph Marston" },
    { text: "The only bad workout is the one that didn't happen.", author: "— Unknown" },
    { text: "Your goals don't care about your feelings. Get to work.", author: "— Unknown" },
    { text: "Success is the sum of small efforts, repeated day in and day out.", author: "— Robert Collier" },
    { text: "Don't watch the clock; do what it does. Keep going.", author: "— Sam Levenson" },
    { text: "The pain of discipline is nothing like the pain of disappointment.", author: "— Unknown" },
    { text: "You didn't come this far to only come this far.", author: "— Unknown" },
    { text: "Be stronger than your strongest excuse.", author: "— Unknown" },
    { text: "Dream big. Start small. Act now.", author: "— Robin Sharma" }
  ];

  function getVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('v');
  }

  function getRandomQuote() {
    return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
  }

  function createMotivationalOverlay() {
    const quote = getRandomQuote();
    const overlay = document.createElement('div');
    overlay.id = 'ufyl-youtube-overlay';
    overlay.className = 'ufyl-overlay';

    const backdrop = document.createElement('div');
    backdrop.className = 'ufyl-overlay-backdrop';

    const content = document.createElement('div');
    content.className = 'ufyl-overlay-content';

    const icon = document.createElement('div');
    icon.className = 'ufyl-overlay-icon';
    icon.textContent = '⏰';

    const title = document.createElement('h2');
    title.textContent = 'Time Check';

    const quoteDiv = document.createElement('div');
    quoteDiv.className = 'ufyl-quote';
    const qt = document.createElement('p');
    qt.className = 'ufyl-quote-text';
    qt.textContent = '"' + quote.text + '"';
    const qa = document.createElement('p');
    qa.className = 'ufyl-quote-author';
    qa.textContent = quote.author;
    quoteDiv.append(qt, qa);

    const timeSpan = document.createElement('div');
    timeSpan.className = 'ufyl-time-spent';
    const span = document.createElement('span');
    span.append('You\'ve been watching for ');
    const strong = document.createElement('strong');
    strong.textContent = (settings['reminder-minutes'] || 20) + ' minutes';
    span.appendChild(strong);
    timeSpan.appendChild(span);

    const actions = document.createElement('div');
    actions.className = 'ufyl-overlay-actions';
    const contBtn = document.createElement('button');
    contBtn.className = 'ufyl-btn ufyl-btn-primary';
    contBtn.id = 'ufyl-continue';
    contBtn.textContent = 'Continue Watching';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'ufyl-btn ufyl-btn-secondary';
    closeBtn.id = 'ufyl-close';
    closeBtn.textContent = 'Close & Get Back to Work';
    actions.append(contBtn, closeBtn);

    const snoozeLabel = document.createElement('label');
    snoozeLabel.className = 'ufyl-snooze';
    const snoozeInput = document.createElement('input');
    snoozeInput.type = 'checkbox';
    snoozeInput.id = 'ufyl-snooze-check';
    snoozeLabel.append(snoozeInput, ' Snooze for 10 more minutes');

    content.append(icon, title, quoteDiv, timeSpan, actions, snoozeLabel);
    overlay.append(backdrop, content);
    document.body.appendChild(overlay);
    overlayShown = true;

    // Event handlers
    overlay.querySelector('#ufyl-continue').addEventListener('click', () => {
      const snooze = overlay.querySelector('#ufyl-snooze-check').checked;
      overlay.remove();
      overlayShown = false;
      if (snooze) {
        setTimeout(() => showReminder(), 10 * 60 * 1000);
      } else {
        videoStartTime = Date.now(); // Reset timer
      }
    });

    overlay.querySelector('#ufyl-close').addEventListener('click', () => {
      overlay.remove();
      overlayShown = false;
      window.close(); // Close tab
    });

    // Pause video when reminder shows
    const video = document.querySelector('video');
    if (video) video.pause();
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

  function showReminder() {
    if (overlayShown) return;
    createMotivationalOverlay();
    trackBlock();
  }

  function checkVideoTimer() {
    if (!settings['quotes-enabled']) return;

    const video = document.querySelector('video');
    const videoId = getVideoId();

    if (!video || !videoId) {
      videoStartTime = null;
      currentVideoId = null;
      return;
    }

    // New video started
    if (videoId !== currentVideoId) {
      currentVideoId = videoId;
      videoStartTime = Date.now();
      overlayShown = false;
    }

    // Check if video is playing and timer exceeded
    if (!video.paused && videoStartTime && !overlayShown) {
      const elapsed = (Date.now() - videoStartTime) / 1000 / 60; // minutes
      const interval = settings['reminder-minutes'] || 20;

      if (elapsed >= interval) {
        showReminder();
      }
    }
  }

  function blockShorts() {
    if (!settings['youtube-shorts']) return;

    // Shelves on homepage / search
    document.querySelectorAll('ytd-reel-shelf-renderer').forEach(el => hide(el));
    document.querySelectorAll('ytd-rich-item-renderer:has(a[href^="/shorts/"])').forEach(el => hide(el));
    document.querySelectorAll('ytd-compact-video-renderer:has(a[href^="/shorts/"])').forEach(el => hide(el));

    // CSS injection to force-hide the sidebar icon (works immediately, no timing issues)
    const styleId = 'reclaim-hide-shorts';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        ytd-guide-entry-renderer:has(a[href="/shorts"]),
        ytd-guide-entry-renderer:has(a[href="/shorts/"]),
        ytd-mini-guide-entry-renderer:has(a[href="/shorts"]),
        ytd-mini-guide-entry-renderer:has(a[href="/shorts/"]),
        a[href="/shorts"],
        a[href="/shorts/"] { display: none !important; }
      `;
      document.head.appendChild(style);
    }

    // Sidebar guide entry — match by label text (both expanded and mini-guide)
    document.querySelectorAll(
      '#guide-label, #label, .guide-label, [id*="guide-label"], ' +
      'ytd-mini-guide-entry-renderer a, ytd-mini-guide-entry-renderer tp-yt-paper-item'
    ).forEach(el => {
      const text = el.textContent.trim().toLowerCase();
      const title = el.getAttribute('title') || '';
      if (text.includes('shorts') || title.toLowerCase().includes('shorts')) {
        hide(el.closest('ytd-guide-entry-renderer') || el.closest('ytd-mini-guide-entry-renderer') || el.closest('[role="listitem"]') || el);
      }
    });

    // Chip filter tab
    document.querySelectorAll('yt-chip-cloud-chip-renderer:has(a[href^="/shorts"])').forEach(el => hide(el));

    // Redirect
    if (window.location.pathname.startsWith('/shorts/')) {
      window.location.replace('/');
    }
  }

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

  function blockHomeRecommendations() {
    if (!settings['youtube-home']) return;

    // CSS injection to force-hide the Home sidebar icon
    if (!document.getElementById('reclaim-hide-home')) {
      const style = document.createElement('style');
      style.id = 'reclaim-hide-home';
      style.textContent = `
        ytd-guide-entry-renderer:has(a[href="/"]),
        ytd-guide-entry-renderer:has(a[href="/feed/recommended"]),
        ytd-mini-guide-entry-renderer:has(a[href="/"]),
        ytd-mini-guide-entry-renderer:has(a[href="/feed/recommended"]) { display: none !important; }
      `;
      document.head.appendChild(style);
    }

    if (window.location.pathname === '/' || window.location.pathname === '/feed/subscriptions') {
      if (window.location.pathname === '/') {
        if (settings['youtube-home-subscriptions']) {
          window.location.replace('/feed/subscriptions');
          return;
        }
        const main = document.querySelector('ytd-browse[role="main"]');
        if (main) {
          hide(main);
          lockPage();
          if (!main.parentElement.querySelector('.ufyl-youtube-home-msg')) {
            const msg = document.createElement('div');
            msg.className = 'ufyl-youtube-home-msg';
            msg.dataset.reclaimMessage = 'true';
            msg.style.cssText = 'padding:60px 20px;text-align:center;max-width:500px;margin:0 auto;';
            const emoji = document.createElement('div');
            emoji.style.cssText = 'font-size:48px;margin-bottom:20px;';
            emoji.textContent = '🎯';
            const title = document.createElement('h3');
            title.style.cssText = 'color:#f1f1f1;margin-bottom:12px;font-size:20px;font-weight:600;';
            title.textContent = 'Home Feed Hidden';
            const p = document.createElement('p');
            p.style.cssText = 'color:#aaa;font-size:14px;margin-bottom:24px;line-height:1.6;';
            p.append(
              document.createTextNode('Recommendations are blocked. Use '),
              Object.assign(document.createElement('strong'), { textContent: 'Subscriptions' }),
              document.createTextNode(' or '),
              Object.assign(document.createElement('strong'), { textContent: 'Search' }),
              document.createTextNode(' to find what you actually want to watch.')
            );
            const btnWrap = document.createElement('div');
            btnWrap.style.cssText = 'display:flex;gap:12px;justify-content:center;flex-wrap:wrap;';
            const subBtn = document.createElement('a');
            subBtn.href = '/feed/subscriptions';
            subBtn.style.cssText = 'padding:10px 20px;background:#222;color:#fff;border-radius:8px;text-decoration:none;font-size:13px;font-weight:500;';
            subBtn.textContent = '📋 Subscriptions';
            const libBtn = document.createElement('a');
            libBtn.href = '/feed/library';
            libBtn.style.cssText = 'padding:10px 20px;background:#222;color:#fff;border-radius:8px;text-decoration:none;font-size:13px;font-weight:500;';
            libBtn.textContent = '📚 Library';
            btnWrap.append(subBtn, libBtn);
            msg.append(emoji, title, p, btnWrap);
            main.parentElement.insertBefore(msg, main);
          }
        }
      }
    }
  }

  function blockSidebar() {
    if (!settings['youtube-sidebar']) return;

    document.querySelectorAll('#secondary.ytd-watch-flexy').forEach(el => {
      hide(el);
    });
  }

  function blockRecommended() {
    if (!settings['youtube-recommended']) return;

    document.querySelectorAll('#related, ytd-watch-next-secondary-results-renderer').forEach(el => {
      hide(el);
    });
  }

  function blockLiveChat() {
    if (!settings['youtube-live-chat']) return;

    document.querySelectorAll('#chat-container, ytd-live-chat-frame, #live-chat-iframe').forEach(el => {
      hide(el);
    });
  }

  function blockPlaylist() {
    if (!settings['youtube-playlist']) return;

    document.querySelectorAll('#playlist, ytd-playlist-panel-renderer, #playlist-iframe').forEach(el => {
      hide(el);
    });
  }

  function blockComments() {
    if (!settings['youtube-comments']) return;

    document.querySelectorAll('ytd-comments, ytd-item-section-renderer#sections').forEach(el => {
      hide(el);
    });
  }

  function blockMixes() {
    if (!settings['youtube-mixes']) return;

    document.querySelectorAll('ytd-radio-renderer, ytd-compact-radio-renderer').forEach(el => {
      hide(el);
    });
    document.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer').forEach(el => {
      const badge = el.querySelector('[aria-label*="Mix"], [aria-label*="mix"]');
      if (badge) hide(el);
    });
  }

  function blockEndScreen() {
    if (!settings['youtube-endscreen']) return;

    document.querySelectorAll('.ytp-endscreen-content').forEach(el => {
      hide(el);
    });
  }

  function blockEndScreenCards() {
    if (!settings['youtube-endscreen-cards']) return;

    document.querySelectorAll('.ytp-ce-element, .ytp-ce-video, .ytp-ce-playlist, .ytp-videowall-still').forEach(el => {
      hide(el);
    });
  }

  function blockNotifications() {
    if (!settings['youtube-notifications']) return;

    document.querySelectorAll('#notification-count, ytd-notification-topbar-button-renderer, #notification-preference-button').forEach(el => {
      hide(el);
    });
  }

  function blockExplore() {
    if (!settings['youtube-explore']) return;

    document.querySelectorAll('a[title="Explore"], a[title="Trending"], a[href="/explore"], a[href="/trending"]').forEach(el => {
      const entry = el.closest('ytd-guide-entry-renderer');
      if (entry) hide(entry);
    });
  }

  let autoplayDisabled = false;

  function disableAutoplay() {
    if (!settings['youtube-autoplay']) return;
    if (autoplayDisabled) return;

    document.querySelectorAll('.ytp-autonav-toggle-button').forEach(btn => {
      if (btn.getAttribute('aria-checked') === 'true') {
        btn.click();
        autoplayDisabled = true;
      }
    });
  }

  function disableAnnotations() {
    if (!settings['youtube-annotations']) return;

    document.querySelectorAll('.annotation, .ytp-annotation, .ytp-cued-thumbnail-overlay, .ytp-cards-teaser, .iv-branding').forEach(el => {
      hide(el);
    });
  }

  function blockFundraiser() {
    if (!settings['youtube-fundraiser']) return;
    document.querySelectorAll('ytd-donation-shelf-renderer, ytd-donation-universal-cart-renderer, ytd-donation-embed-renderer').forEach(el => hide(el));
  }

  function blockMerch() {
    if (!settings['youtube-merch']) return;
    document.querySelectorAll('ytd-merch-shelf-renderer, ytd-ticket-shelf-renderer, ytd-transaction-offers-module-renderer').forEach(el => hide(el));
  }

  function blockInaptSearch() {
    if (!settings['youtube-inapt-search']) return;
    document.querySelectorAll('ytd-search ytd-promoted-sparkles-web-renderer, ytd-search ytd-display-ad-renderer, ytd-search ytd-ad-slot-renderer, ytd-search ytd-search-pyv-renderer').forEach(el => hide(el));
  }

  function blockMoreFromYoutube() {
    if (!settings['youtube-more-from-youtube']) return;
    document.querySelectorAll('ytd-guide-entry-renderer:has(a[href="/premium"]), ytd-guide-entry-renderer:has(a[href^="https://music.youtube.com"]), ytd-guide-entry-renderer:has(a[href^="https://www.youtubekids.com"]), ytd-guide-entry-renderer:has(a[href="/paid_memberships"]), ytd-guide-entry-renderer:has(a[href*="studio.youtube.com"])').forEach(el => hide(el));
  }

  function blockSubscriptionsNav() {
    if (!settings['youtube-subscriptions-nav']) return;
    document.querySelectorAll('ytd-guide-entry-renderer:has(a[href="/feed/subscriptions"])').forEach(el => hide(el));
  }

  function blockVideoInfo() {
    if (!settings['youtube-video-info']) return;
    if (window.location.pathname === '/watch') {
      document.querySelectorAll('#info ytd-video-primary-info-renderer, #info-contents, #title, #info-strings, #owner').forEach(el => hide(el));
    }
  }

  function blockButtonsBar() {
    if (!settings['youtube-buttons-bar']) return;
    document.querySelectorAll('ytd-watch-metadata #top-level-buttons-computed, ytd-menu-renderer.ytd-watch-metadata #top-level-buttons, #actions-inner > ytd-menu-renderer').forEach(el => hide(el));
  }

  function blockChannel() {
    if (!settings['youtube-channel']) return;
    document.querySelectorAll('ytd-watch-metadata ytd-channel-name, ytd-watch-metadata #owner, #owner').forEach(el => hide(el));
  }

  function blockDescription() {
    if (!settings['youtube-description']) return;
    document.querySelectorAll('ytd-watch-metadata #description, ytd-watch-metadata ytd-text-inline-expander, ytd-expandable-video-description-body-renderer').forEach(el => hide(el));
  }

  function blockTopHeader() {
    if (!settings['youtube-top-header']) return;
    document.querySelectorAll('#masthead-container, ytd-masthead').forEach(el => hide(el));
  }

  function applyBlocks() {
    if (settings['extension-active'] === false || settings['youtube-enabled'] === false) return;

    blockShorts();
    blockHomeRecommendations();
    blockSidebar();
    blockRecommended();
    blockLiveChat();
    blockPlaylist();
    blockComments();
    blockMixes();
    blockFundraiser();
    blockMerch();
    blockEndScreen();
    blockEndScreenCards();
    blockNotifications();
    blockExplore();
    blockSubscriptionsNav();
    blockMoreFromYoutube();
    blockInaptSearch();
    blockVideoInfo();
    blockButtonsBar();
    blockChannel();
    blockDescription();
    blockTopHeader();
    disableAutoplay();
    disableAnnotations();
    checkVideoTimer();
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
      if (settings['extension-active'] === false || settings['youtube-enabled'] === false) {
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
    startTimeTracking('youtube');
    startPolling();

    videoTimer = setInterval(checkVideoTimer, 10000);

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
    if (videoTimer) clearInterval(videoTimer);
    if (window.ufylTimeInterval) clearInterval(window.ufylTimeInterval);
    if (window.ufylPollInterval) { clearInterval(window.ufylPollInterval); window.ufylPollInterval = null; }
    overlayShown = false;
    videoStartTime = null;
    currentVideoId = null;
    init();
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    Object.entries(changes).forEach(([k, v]) => {
      if (v.newValue !== undefined) settings[k] = v.newValue;
    });
    if (settings['extension-active'] === false || settings['youtube-enabled'] === false) {
      if (observer) observer.disconnect();
      if (videoTimer) clearInterval(videoTimer);
      if (window.ufylTimeInterval) clearInterval(window.ufylTimeInterval);
      if (window.ufylPollInterval) { clearInterval(window.ufylPollInterval); window.ufylPollInterval = null; }
      overlayShown = false;
      restoreBlocks();
      return;
    }
    if (observer) observer.disconnect();
    if (videoTimer) clearInterval(videoTimer);
    if (window.ufylTimeInterval) clearInterval(window.ufylTimeInterval);
    if (window.ufylPollInterval) { clearInterval(window.ufylPollInterval); window.ufylPollInterval = null; }
    overlayShown = false;
    videoStartTime = null;
    currentVideoId = null;
    restoreBlocks();
    applyBlocks();
    startTimeTracking('youtube');
    startPolling();
    videoTimer = setInterval(checkVideoTimer, 10000);
    observer = new MutationObserver(() => applyBlocks());
    observer.observe(document.documentElement, { childList: true, subtree: true });
  });

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'refreshSettings') {
      if (request.settings) settings = Object.assign({}, DEFAULTS, request.settings);
      if (settings['extension-active'] === false || settings['youtube-enabled'] === false) {
        if (observer) observer.disconnect();
        if (videoTimer) clearInterval(videoTimer);
        if (window.ufylTimeInterval) clearInterval(window.ufylTimeInterval);
        if (window.ufylPollInterval) { clearInterval(window.ufylPollInterval); window.ufylPollInterval = null; }
        overlayShown = false;
        restoreBlocks();
        return;
      }
      if (observer) observer.disconnect();
      if (videoTimer) clearInterval(videoTimer);
      if (window.ufylTimeInterval) clearInterval(window.ufylTimeInterval);
      if (window.ufylPollInterval) { clearInterval(window.ufylPollInterval); window.ufylPollInterval = null; }
      overlayShown = false;
      videoStartTime = null;
      currentVideoId = null;
      restoreBlocks();
      applyBlocks();
      startTimeTracking('youtube');
      startPolling();
      videoTimer = setInterval(checkVideoTimer, 10000);
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
