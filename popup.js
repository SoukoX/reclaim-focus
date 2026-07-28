const ALL_KEYS = Object.keys(DEFAULTS);

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', color: '#E1306C' },
  { id: 'youtube', label: 'YouTube', color: '#FF6B00' },
  { id: 'tiktok', label: 'TikTok', color: '#00f2ea' },
  { id: 'facebook', label: 'Facebook', color: '#F59E0B' }
];

// ===== MOTIVATIONAL QUOTES =====
const QUOTES = [
  "Your future self is watching you right now through memories.",
  "Discipline is choosing between what you want now and what you want most.",
  "The time will pass anyway. Use it wisely.",
  "Small steps every day. That's the formula.",
  "Your focus determines your reality.",
  "One hour of deep work beats 4 hours of distracted scrolling.",
  "What you do today can improve all your tomorrows.",
  "The only bad workout is the one that didn't happen.",
  "Your goals don't care about your feelings. Get to work.",
  "Success is the sum of small efforts, repeated day in and day out.",
  "Don't watch the clock; do what it does. Keep going.",
  "The pain of discipline is nothing like the pain of disappointment.",
  "You didn't come this far to only come this far.",
  "Be stronger than your strongest excuse.",
  "Dream big. Start small. Act now."
];

// ===== DOM READY =====
document.addEventListener('DOMContentLoaded', () => {
  setupPlatformCards();
  setupEventListeners();
  loadSettings();
  loadTheme();
  updateStats();
  updateTimeTracking();
  setupSupportModal();
});

// ===== SUPPORT MODAL =====
function setupSupportModal() {
  const link = document.getElementById('support-link');
  const modal = document.getElementById('support-modal');
  const close = document.getElementById('modal-close');
  if (!link || !modal || !close) return;

  link.addEventListener('click', (e) => {
    e.preventDefault();
    modal.classList.add('show');
  });

  close.addEventListener('click', () => {
    modal.classList.remove('show');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('show');
  });
}

// Cleanup on popup close
window.addEventListener('unload', () => {
  if (timerInterval) clearInterval(timerInterval);
});

// ===== LOAD SETTINGS =====
function loadSettings() {
  chrome.storage.local.get(null, (data) => {
    const toSave = {};
    Object.keys(DEFAULTS).forEach(key => {
      if (!(key in data)) {
        toSave[key] = DEFAULTS[key];
      }
    });
    if (Object.keys(toSave).length > 0) {
      chrome.storage.local.set(toSave);
    }

    const merged = Object.assign({}, DEFAULTS, data);

    Object.keys(DEFAULTS).forEach(key => {
      const el = document.getElementById(key);
      if (!el) return;

      if (el.type === 'checkbox') {
        el.checked = merged[key];
      } else if (el.type === 'number' || el.type === 'time') {
        el.value = merged[key];
      }
    });

    updatePowerButton(merged['extension-active'] !== false);

    updatePlatformStates();
    updateScheduleControls();
    updateFocusTimerStatus();
  });
}

// ===== SETUP EVENT LISTENERS =====
function setupEventListeners() {
  // Theme toggle
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  // Power toggle
  document.getElementById('powerToggle').addEventListener('click', toggleExtension);

  // Platform master toggles
  ['instagram', 'youtube', 'tiktok', 'facebook'].forEach(platform => {
    const toggle = document.getElementById(`${platform}-enabled`);
    if (toggle) {
      toggle.addEventListener('change', () => {
        updatePlatformState(platform);
        autoSave();
      });
    }
  });

  // Focus timer button
  document.getElementById('focus-toggle').addEventListener('click', toggleFocusTimer);

  document.getElementById('schedule-enabled').addEventListener('change', () => {
    updateScheduleControls();
    autoSave();
  });

  // Auto-save on any checkbox, number, or time change
  document.querySelectorAll('.controls input, .focus-section input[type="checkbox"], .focus-section input[type="number"], .schedule-section input').forEach(el => {
    el.addEventListener('change', autoSave);
  });
}

// ===== PLATFORM CARDS =====
function setupPlatformCards() {
  document.querySelectorAll('.platform-card').forEach(card => {
    const header = card.querySelector('.platform-header');
    header.addEventListener('click', (e) => {
      // Don't collapse if clicking the toggle
      if (e.target.closest('.toggle-switch')) return;
      card.classList.toggle('expanded');
    });
  });

  // Expand first card by default
  document.querySelector('.platform-card').classList.add('expanded');
}

// ===== UPDATE PLATFORM STATES =====
function updatePlatformStates() {
  ['instagram', 'youtube', 'tiktok', 'facebook'].forEach(platform => {
    updatePlatformState(platform);
  });
}

function updatePlatformState(platform) {
  const enabled = document.getElementById(`${platform}-enabled`).checked;
  const card = document.querySelector(`[data-platform="${platform}"]`);

  if (enabled) {
    card.classList.remove('disabled');
  } else {
    card.classList.add('disabled');
  }
}

// ===== UPDATE FOCUS TIMER =====
let timerInterval = null;

function updateFocusTimerStatus() {
  if (typeof chrome === 'undefined' || !chrome.runtime) return;
  chrome.runtime.sendMessage({ action: 'getTimerStatus' }, (response) => {
    if (response && response.running) {
      document.getElementById('focus-toggle').textContent = 'Stop';
      document.getElementById('focus-toggle').classList.add('btn-stop');
      document.getElementById('focus-toggle').classList.remove('btn-start');
      document.getElementById('timer-display').style.display = 'block';
      startTimerCountdown(response.startTime, response.scheduledTime);
    } else {
      document.getElementById('timer-display').style.display = 'none';
    }
  });
}

function startTimerCountdown(startTime, nextAlarmTime) {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const now = Date.now();
    // Elapsed focus time
    if (startTime) {
      const elapsed = Math.floor((now - startTime) / 1000);
      const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const s = String(elapsed % 60).padStart(2, '0');
      document.getElementById('elapsed-time').textContent = m + ':' + s;
    }
    // Reminder countdown
    if (nextAlarmTime) {
      const remaining = Math.max(0, Math.floor((nextAlarmTime - now) / 1000));
      const m = String(Math.floor(remaining / 60)).padStart(2, '0');
      const s = String(remaining % 60).padStart(2, '0');
      document.getElementById('reminder-countdown').textContent = m + ':' + s;
      if (remaining <= 0) {
        // Timer completed — re-check status
        chrome.runtime.sendMessage({ action: 'getTimerStatus' }, (res) => {
          if (res && !res.running) {
            clearInterval(timerInterval);
            timerInterval = null;
            document.getElementById('focus-toggle').textContent = 'Start';
            document.getElementById('focus-toggle').classList.add('btn-start');
            document.getElementById('focus-toggle').classList.remove('btn-stop');
            document.getElementById('timer-display').style.display = 'none';
          }
        });
      }
    }
  }, 500);
}

function toggleFocusTimer() {
  const btn = document.getElementById('focus-toggle');
  const isRunning = btn.textContent === 'Stop';

  if (isRunning) {
    chrome.runtime.sendMessage({ action: 'stopFocusTimer' });
    btn.textContent = 'Start';
    btn.classList.add('btn-start');
    btn.classList.remove('btn-stop');
    document.getElementById('timer-display').style.display = 'none';
    if (timerInterval) clearInterval(timerInterval);
    showStatus('Timer stopped');
  } else {
    const minutes = Number(document.getElementById('reminder-minutes').value) || 20;
    chrome.runtime.sendMessage({ action: 'startFocusTimer', interval: minutes }, () => {
      updateFocusTimerStatus();
    });
    showStatus('Timer started');
  }
}

// ===== UPDATE SCHEDULE CONTROLS =====
function updateScheduleControls() {
  const enabled = document.getElementById('schedule-enabled').checked;
  const controls = document.getElementById('schedule-controls');
  controls.style.display = enabled ? 'block' : 'none';
}

// ===== THEME TOGGLE =====
function toggleTheme() {
  const hasLight = document.documentElement.classList.toggle('light');
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.set({ 'theme-dark': !hasLight });
  }
}

function loadTheme() {
  if (typeof chrome === 'undefined' || !chrome.storage) return;
  chrome.storage.local.get(['theme-dark'], (data) => {
    document.documentElement.classList.toggle('light', !data['theme-dark']);
  });
}

// ===== POWER TOGGLE =====
function toggleExtension() {
  const btn = document.getElementById('powerToggle');
  const isActive = btn.classList.toggle('active');
  btn.classList.toggle('inactive', !isActive);
  btn.classList.add('power-flip');
  setTimeout(() => btn.classList.remove('power-flip'), 300);
  document.body.classList.toggle('power-off', !isActive);

  showStatus(isActive ? 'Extension ON' : 'Extension OFF');

  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.set({ 'extension-active': isActive });
    refreshAllTabs({ 'extension-active': isActive });
  }
}

function updatePowerButton(active) {
  const btn = document.getElementById('powerToggle');
  btn.classList.remove('active', 'inactive', 'power-flip');
  btn.classList.add(active ? 'active' : 'inactive');
  document.body.classList.toggle('power-off', !active);
}

// ===== AUTO-SAVE =====
let saveTimeout = null;

function autoSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveSettings, 200);
}

function saveSettings() {
  const update = {};

  ALL_KEYS.forEach(key => {
    const el = document.getElementById(key);
    if (!el) return;

    if (el.type === 'checkbox') {
      update[key] = el.checked;
    } else if (el.type === 'number') {
      update[key] = Number(el.value);
    } else {
      update[key] = el.value;
    }
  });

  showStatus('Saved');
  if (typeof chrome === 'undefined' || !chrome.storage) return;
  chrome.storage.local.set(update);
  refreshAllTabs(update);
}

function refreshAllTabs(update) {
  if (typeof chrome === 'undefined' || !chrome.tabs) return;
  chrome.storage.local.get(null, (data) => {
    const merged = Object.assign({}, DEFAULTS, data, update || {});
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        const url = tab.url || '';
        if (url.includes('instagram') || url.includes('youtube') || 
            url.includes('tiktok') || url.includes('facebook')) {
          chrome.tabs.sendMessage(tab.id, { 
            action: 'refreshSettings',
            settings: merged
          }).catch(() => {});
        }
      });
    });
  });
}

// ===== SHOW STATUS =====
function showStatus(msg) {
  const status = document.getElementById('status');
  status.textContent = msg;
  status.classList.add('show');
  setTimeout(() => status.classList.remove('show'), 2000);
}

// ===== UPDATE STATS =====
function updateStats() {
  chrome.storage.local.get(['daily-log', 'blocks-today', 'focus-streak', 'last-active'], (data) => {
    const log = data['daily-log'] || {};
    const today = new Date().toISOString().slice(0, 10);
    const todayData = log[today] || {};
    const trackedMinutes = PLATFORMS.reduce((s, p) => s + Math.round((todayData[p.id] || 0) / 60), 0);
    document.getElementById('timeSaved').textContent = trackedMinutes;

    let streak = data['focus-streak'] || 0;
    const lastActive = data['last-active'];
    if (lastActive) {
      const today = new Date().toDateString();
      const lastDate = new Date(lastActive).toDateString();
      if (lastDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        if (lastDate !== yesterday) {
          streak = 0;
        }
      }
    }
    document.getElementById('focusStreak').textContent = streak;
  });
}

// ===== TIME TRACKING =====
function updateTimeTracking() {
  chrome.storage.local.get(['daily-log'], (data) => {
    const log = data['daily-log'] || {};
    const today = new Date().toISOString().slice(0, 10);
    const todayData = log[today] || {};

    // Render today's time per platform
    const container = document.getElementById('platform-times');
    let hasData = false;
    container.textContent = '';
    PLATFORMS.forEach(p => {
      const minutes = Math.round((todayData[p.id] || 0) / 60);
      if (minutes > 0) hasData = true;
      const item = document.createElement('div');
      item.className = 'platform-time-item';

      const dot = document.createElement('span');
      dot.className = 'platform-time-dot';
      dot.style.background = p.color;

      const label = document.createElement('span');
      label.textContent = p.label;

      const val = document.createElement('span');
      val.className = 'platform-time-value';
      val.textContent = minutes + 'm';

      item.append(dot, label, val);
      container.appendChild(item);
    });

    if (!hasData) {
      const empty = document.createElement('div');
      empty.style.cssText = 'font-size:11px;color:var(--text-muted);padding:8px 0;';
      empty.textContent = 'No time tracked today';
      container.appendChild(empty);
    }

    drawChart(log);
  });
}

function drawChart(log) {
  const canvas = document.getElementById('timeChart');
  const empty = document.getElementById('chart-empty');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const P = { top: 10, bottom: 22, left: 32, right: 8 };
  const chartW = W - P.left - P.right;
  const chartH = H - P.top - P.bottom;

  ctx.clearRect(0, 0, W, H);

  // Gather last 7 days
  const days = [];
  let maxTotal = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayData = log[key] || {};
    const total = PLATFORMS.reduce((s, p) => s + (dayData[p.id] || 0), 0);
    if (total > maxTotal) maxTotal = total;
    days.push({
      label: d.toLocaleDateString('en', { weekday: 'short' }),
      data: dayData,
      total
    });
  }

  if (maxTotal === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  const barWidth = (chartW - days.length) / days.length;

  // Y-axis labels
  ctx.fillStyle = '#6b6b76';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'right';
  const ySteps = [0, 0.25, 0.5, 0.75, 1];
  ySteps.forEach(f => {
    const y = P.top + chartH * (1 - f);
    const val = Math.round(maxTotal * f / 60);
    ctx.fillText(val + 'm', P.left - 4, y + 3);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(P.left, y);
    ctx.lineTo(W - P.right, y);
    ctx.stroke();
  });

  // Bars — store full bar data for hover (all platforms per day)
  const bars = [];
  days.forEach((day, i) => {
    const x = P.left + i * (chartW / days.length) + 1;
    let yOffset = P.top + chartH;
    const segDate = new Date();
    segDate.setDate(segDate.getDate() - (6 - i));

    const platforms = [];

    if (day.total === 0) {
      ctx.fillStyle = '#2a2a35';
      ctx.fillRect(x, P.top + chartH - 2, barWidth, 2);
    } else {
      PLATFORMS.forEach((p) => {
        const h = ((day.data[p.id] || 0) / maxTotal) * chartH;
        if (h > 0.5) {
          ctx.fillStyle = p.color;
          ctx.fillRect(x, yOffset - h, barWidth, h);
          platforms.push({
            label: p.label,
            color: p.color,
            seconds: day.data[p.id] || 0
          });
          yOffset -= h;
        }
      });
    }

    bars.push({
      x, w: barWidth,
      day: day.label,
      dateLabel: segDate.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      platforms
    });

    ctx.fillStyle = '#6b6b76';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(day.label, x + barWidth / 2, H - 5);
  });

  // Store for hover
  canvas._bars = bars;
}

// ===== CHART HOVER =====
(function() {
  let tooltipEl = null;
  let activeCanvas = null;
  let hoverTimeout = null;

  document.addEventListener('mouseover', function(e) {
    const canvas = e.target.closest('#timeChart');
    if (canvas && canvas._bars) {
      activeCanvas = canvas;
      canvas.addEventListener('mousemove', onChartMove);
      canvas.addEventListener('mouseleave', onChartLeave);
    }
  }, true);

  function getTooltip() {
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.id = 'chart-tooltip';
      document.body.appendChild(tooltipEl);
    }
    return tooltipEl;
  }

  function onChartMove(e) {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const bars = canvas._bars || [];

    let found = null;
    for (const b of bars) {
      if (mx >= b.x && mx <= b.x + b.w) {
        found = b;
        break;
      }
    }

    const tooltip = getTooltip();
    if (found && found.platforms.length > 0) {
      tooltip.textContent = '';
      const header = document.createElement('div');
      header.className = 'tt-header';
      header.textContent = found.day + ' ' + found.dateLabel;
      tooltip.appendChild(header);
      found.platforms.forEach(p => {
        const mins = Math.round(p.seconds / 60);
        const row = document.createElement('div');
        row.className = 'tt-row';
        const dot = document.createElement('span');
        dot.className = 'tt-dot';
        dot.style.background = p.color;
        row.append(dot, p.label + ': ');
        const strong = document.createElement('strong');
        strong.textContent = mins + 'm';
        row.appendChild(strong);
        tooltip.appendChild(row);
      });
      tooltip.style.display = 'block';
      tooltip.style.left = (e.clientX - 140) + 'px';
      tooltip.style.top = (e.clientY - 10) + 'px';
    } else {
      tooltip.style.display = 'none';
    }
  }

  function onChartLeave() {
    if (tooltipEl) tooltipEl.style.display = 'none';
    if (hoverTimeout) clearTimeout(hoverTimeout);
  }

  // Clean up tooltip on popup close
  window.addEventListener('unload', function() {
    if (tooltipEl && tooltipEl.parentNode) tooltipEl.parentNode.removeChild(tooltipEl);
    if (activeCanvas) {
      activeCanvas.removeEventListener('mousemove', onChartMove);
      activeCanvas.removeEventListener('mouseleave', onChartLeave);
    }
  });
})();
