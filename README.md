
# Text Mini Menu

A lightweight Chromium extension that displays a compact context menu when text is selected.
![Version](https://img.shields.io/badge/version-1.0-green.svg)

## Features

- Search selected text using the browser's default search engine.
- Copy selected text.
- Copy as plain text (normalized whitespace).
- Open detected URLs.
- Call detected phone numbers.
- Create an email from detected email addresses.
- Smart popup positioning.
- Automatic popup closing.
- Lightweight and fast.

## Supported content

| Type | Action |
|------|--------|
| Text | Search, Copy, Plain Copy |
| URL | Open Link |
| Email | Send Email |
| Phone | Call Number |

## Installation

1. Download or clone the repository.
2. Open `chrome://extensions/` or `edge://extensions/`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the extension folder.

## Permissions

- `search`
- `clipboardWrite`
- `<all_urls>`

## Project structure

```text
background.js
content.js
styles.css
manifest.json
icons/
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
