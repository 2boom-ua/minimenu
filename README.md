<div align="center">  
    <img src="https://github.com/2boom-ua/minimenu/blob/main/icons/icon-128.png?raw=true" alt="" width="128" height="128">
</div>

# Text Mini Menu

A compact menu that appears when you select text on a webpage. It provides quick access to useful text actions without getting in your way.

![Version](https://img.shields.io/badge/version-2.5-green.svg)

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
- **Disable extension on specific domains** — disable extension on specific sites via context menu.
- **Switch between vertical and horizontal menu layout** — choose your preferred popup style via context menu.

## Supported content

| Type | Actions |
|------|---------|
| Regular text (non-editable) | Copy, Search, Share |
| Input fields (INPUT, TEXTAREA, contenteditable) | Cut, Paste, Copy |

## Installation

### From Chrome Web Store or Edge Add-ons
[![Available in the Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Install-blue?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/text-mini-menu/gealibgfjafhpednkbekefbhomkhdhfi)
[![Available in Microsoft Edge Add-ons](https://img.shields.io/badge/Microsoft%20Edge%20Add--ons-Install-0078D7?logo=microsoftedge&logoColor=white)](https://microsoftedge.microsoft.com/addons/detail/text-mini-menu/ijpbfhbbdngpebnhpmdfbiiaoepfdoip)

### Manual Installation (Developer Mode)

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
- `contextMenus`

## Project structure

```text
background.js
minimenu.js
manifest.json
icons/
icons/chrome
icons/edge
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
