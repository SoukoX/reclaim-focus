chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install' || details.reason === 'update') {
    chrome.storage.local.get(null, (existing) => {
      const toSet = {};
      Object.keys(DEFAULTS).forEach(key => {
        if (!(key in existing)) {
          toSet[key] = DEFAULTS[key];
        }
      });
      if (Object.keys(toSet).length > 0) {
        chrome.storage.local.set(toSet);
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startFocusTimer') {
    const interval = message.interval || 20;
    const now = Date.now();
    chrome.alarms.clear('focusReminder');
    chrome.alarms.create('focusReminder', { delayInMinutes: interval });
    chrome.storage.local.set({ 'focus-timer-running': true, 'focus-timer-start': now, 'focus-timer-interval': interval });
    sendResponse({ status: 'started' });
  } else if (message.action === 'stopFocusTimer') {
    chrome.alarms.clear('focusReminder');
    chrome.storage.local.set({ 'focus-timer-running': false, 'focus-timer-start': null, 'focus-timer-interval': null });
    sendResponse({ status: 'stopped' });
  } else if (message.action === 'getTimerStatus') {
    chrome.alarms.get('focusReminder', (alarm) => {
      chrome.storage.local.get(['focus-timer-start', 'focus-timer-interval'], (data) => {
        sendResponse({
          running: !!alarm,
          scheduledTime: alarm ? alarm.scheduledTime : null,
          startTime: data['focus-timer-start'] || null,
          interval: data['focus-timer-interval'] || null
        });
      });
    });
    return true;
  } else if (message.action === 'addTime') {
    // Atomic time tracking — background script is single-threaded, no race
    const { platform, seconds } = message;
    const today = new Date().toISOString().slice(0, 10);
    chrome.storage.local.get(['daily-log'], (data) => {
      const log = data['daily-log'] || {};
      if (!log[today]) log[today] = {};
      log[today][platform] = (log[today][platform] || 0) + seconds;
      chrome.storage.local.set({ 'daily-log': log });
    });
    sendResponse({ status: 'ok' });
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== 'focusReminder') return;
  // One-shot timer: stop after firing
  chrome.storage.local.set({ 'focus-timer-running': false, 'focus-timer-start': null, 'focus-timer-interval': null });
  chrome.storage.local.get(['quotes-enabled'], (data) => {
    showReminder(data['quotes-enabled']);
  });
});

function getRandomQuote() {
  const quotes = [
    "Your future self is watching you right now through memories.",
    "Discipline is choosing between what you want now and what you want most.",
    "The time will pass anyway. Use it wisely.",
    "Small steps every day. That's the formula.",
    "Your focus determines your reality.",
    "One hour of deep work beats 4 hours of distracted scrolling.",
    "What you do today can improve all your tomorrows.",
    "Your goals don't care about your feelings. Get to work.",
    "Success is the sum of small efforts, repeated day in and day out.",
    "Don't watch the clock; do what it does. Keep going.",
    "The pain of discipline is nothing like the pain of disappointment.",
    "You didn't come this far to only come this far.",
    "Be stronger than your strongest excuse.",
    "Dream big. Start small. Act now."
  ];
  return quotes[Math.floor(Math.random() * quotes.length)];
}

function showReminder(quotesEnabled) {
  let msg = 'Time to refocus. Stay on track!';
  if (quotesEnabled !== false) {
    msg = getRandomQuote();
  }
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Reclaim Reminder',
    message: msg
  });
}
