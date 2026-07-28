# Reclaim Focus

**Take back your attention. Block mindless scrolling while keeping what matters.**

[![Mozilla Add-on](https://img.shields.io/amo/v/reclaim-focus?label=Firefox&logo=firefox-browser&color=FF7139)](https://addons.mozilla.org/en-US/firefox/addon/reclaim-focus/)
[![Mozilla Add-on](https://img.shields.io/amo/dw/reclaim-focus?label=Downloads&logo=firefox-browser&color=FF7139)](https://addons.mozilla.org/en-US/firefox/addon/reclaim-focus/)
[![Mozilla Add-on](https://img.shields.io/amo/stars/reclaim-focus?label=Rating&color=FF7139)](https://addons.mozilla.org/en-US/firefox/addon/reclaim-focus/reviews/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GitHub](https://img.shields.io/github/stars/SoukoX/reclaim-focus?style=social)](https://github.com/SoukoX/reclaim-focus)

---

## Features

- **Block distractions** — Hide feeds, reels, shorts, For You pages, recommendations, explore tabs, and more on YouTube, Instagram, Facebook, and TikTok.
- **Granular controls** — Each platform has individual toggles for every element. Keep what's useful (messages, search, subscriptions), block what's not.
- **Focus Timer** — Set a reminder interval. When time's up, a motivational overlay reminds you to get back to work.
- **Time Tracking** — See exactly how much time you spend per platform, with a 7-day chart breakdown.
- **Schedule** — Only block during active hours (e.g., 9 AM – 5 PM on weekdays).
- **Power Toggle** — Instantly pause all blocking with one button.
- **Privacy First** — All data stored locally. Zero data sent to any server.
- **Dark/Light Theme** — Easy on the eyes, day or night.

## Platforms

| Platform | Blocks | Preserves |
|----------|--------|-----------|
| YouTube | Home feed, Shorts, Recommendations, Sidebar, Comments, Autoplay, Live Chat, Playlists, End screens, Explore/Trending, Subscriptions nav, Merch, Fundraisers, Annotations, Inapt search results | Search, Subscriptions page |
| Instagram | Feed, Reels, Explore, Suggested accounts, Notifications | Messages, Stories |
| Facebook | Home feed, News Feed, Reels, Watch, Stories, Notifications | Messenger, Events |
| TikTok | For You feed, Following feed, Discover, Search, Notifications | Inbox, Profile |

## Installation

### From AMO (recommended)

[Install from Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/reclaim-focus/)

### From source (development)

```bash
git clone https://github.com/SoukoX/reclaim-focus.git
cd reclaim-focus
```

Then load in Firefox:
1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on...**
3. Select `manifest.json`

### Using web-ext (for developers)

```bash
npm install
npm run start   # Opens Firefox with the extension loaded
npm run build   # Builds a .xpi package
npm run lint    # Lints the extension
```

## Usage

1. Click the Reclaim icon in the toolbar to open the popup.
2. Toggle platforms on/off using the master switches.
3. Expand each platform card to configure granular blocking options.
4. Use the **Focus Timer** to set mindful breaks.
5. Check **Time Tracking** to see your usage patterns.
6. Set **Active Hours** to only block during specific times.

## Configuration

All settings are stored locally using `chrome.storage.local`. They sync across tabs automatically.

### Default Settings

See [`defaults.js`](defaults.js) for the complete list of configurable options.

## Development

### Project Structure

```
reclaim-focus/
├── manifest.json          # Extension manifest
├── background.js          # Background service worker
├── defaults.js            # Default settings
├── popup.html             # Popup UI
├── popup.js               # Popup logic
├── popup.css              # Popup styles
├── logo.jpg               # Popup logo
├── content/
│   ├── hide.css           # Shared overlay styles
│   ├── youtube.js         # YouTube content script
│   ├── instagram.js       # Instagram content script
│   ├── facebook.js        # Facebook content script
│   └── tiktok.js          # TikTok content script
├── icons/                 # Extension icons (16/32/48/128px)
└── tests/                 # Test files
```

### Building

```bash
npm run build
```

The `.xpi` file will be in the `web-ext-artifacts/` directory.

### Linting

```bash
npm run lint
```

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Privacy

Reclaim Focus stores all data **locally** on your device. Nothing is sent to any server. No analytics, no tracking, no telemetry.

## License

[MIT](LICENSE)

## Support

- [Report a bug](https://github.com/SoukoX/reclaim-focus/issues/new?template=bug_report.yml)
- [Request a feature](https://github.com/SoukoX/reclaim-focus/issues/new?template=feature_request.yml)
- [Review on AMO](https://addons.mozilla.org/en-US/firefox/addon/reclaim-focus/reviews/)
