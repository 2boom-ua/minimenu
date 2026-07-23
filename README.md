
# Text Mini Menu

A lightweight Chromium extension that displays a compact context menu when text is selected.

![Version](https://img.shields.io/badge/version-1.5-green.svg)

## Features

- **Copy** selected text to clipboard.
- **Search** selected text using the browser's default search engine.
- **Share** selected text via native Web Share API.
- **Paste** clipboard content into active input field (available in INPUT, TEXTAREA, contenteditable).
- **Cut** selected text from input field (available in INPUT, TEXTAREA, contenteditable).
- **Smart popup positioning** with multi-line selection support.
- **Auto-reposition** on scroll and window resize.
- **Automatic popup closing** after 10 seconds of inactivity.
- **Theme-aware** light/dark mode support.
- **Site disable** functionality — disable extension on specific sites via context menu or side panel.
- **Export/Import** disabled sites list as JSON.

## Supported content

| Type | Actions |
|------|---------|
| Regular text (non-editable) | Copy, Search, Share |
| Input fields (INPUT, TEXTAREA, contenteditable) | Cut, Paste, Copy |

## Installation

1. Download or clone the repository.
2. Open `chrome://extensions/` or `edge://extensions/`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the extension folder.

## Permissions

- `search`
- `clipboardWrite`
- `clipboardRead`
- `storage`
- `sidePanel`
- `<all_urls>`

## Project structure

```text
background.js
minimenu.js
manifest.json
icons/
_locales/
```

## Browser compatibility

- Chrome
- Edge
- Brave
- Opera
- Vivaldi
- Chromium

## Privacy

- No analytics
- No tracking
- No external servers
- All processing is performed locally

## License

Copyright © 2026 2boom.
