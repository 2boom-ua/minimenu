// Text Mini Menu
// Copyright 2boom, 2026

let popup = null;
let selectedText = '';
let isClosing = false;
let ignoreNextMouseUp = false;
let lastSelectedText = '';
let popupTimer = null;
let closedByTimer = false;
let clickOnSelectedText = false;
let selectionTimer = null;
let lastSelectionChange = 0;
let isMouseSelection = false;
let isCreatingPopup = false;
let lastClipboardText = '';
let clipboardCheckTime = 0;
const CLIPBOARD_CACHE_MS = 500;
let lastPopupPosition = null;
let lastSelectionRects = null;
let savedInputElement = null;

let savedMousePosition = null;

function isContextValid() {
  try {
    return !!chrome.runtime.id;
  } catch (e) {
    return false;
  }
}

function getMessage(key) {
  try {
    return chrome.i18n.getMessage(key) || key;
  } catch (e) {
    return key;
  }
}

function getIconUrl(iconName) {
  if (!isContextValid()) {
    removePopup();
    return '';
  }

  try {
    return chrome.runtime.getURL(iconName);
  } catch (e) {
    removePopup();
    return '';
  }
}

function createIconButton(iconPath, altText) {
  const button = document.createElement('button');
  button.className = 'menu-btn';

  const iconUrl = getIconUrl(iconPath);
  if (!iconUrl) {
    return button;
  }

  const icon = document.createElement('span');
  icon.className = 'menu-icon';
  icon.style.cssText = `
    display: inline-block;
    width: 18px;
    height: 18px;
    background-image: url('${iconUrl}');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    flex-shrink: 0;
  `;
  icon.setAttribute('aria-label', altText);

  button.appendChild(icon);

  return button;
}

function createLabeledButton(iconPath, altText, labelText) {
  const wrapper = document.createElement('div');
  wrapper.className = 'menu-btn-wrapper';

  const button = document.createElement('button');
  button.className = 'menu-btn';

  const iconUrl = getIconUrl(iconPath);
  if (!iconUrl) {
    return wrapper;
  }

  const iconWrapper = document.createElement('span');
  iconWrapper.className = 'icon-wrapper';
  iconWrapper.style.cssText = `
    all: initial !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    flex-shrink: 0 !important;
    width: 18px !important;
    height: 18px !important;
  `;

  const isDarkTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const lightFilter = 'invert(28%) sepia(0%) saturate(1703%) hue-rotate(268deg) brightness(90%) contrast(86%)';
  const darkFilter = 'invert(90%) sepia(99%) saturate(0%) hue-rotate(147deg) brightness(89%) contrast(90%)';

  const icon = document.createElement('span');
  icon.className = 'menu-icon';
  icon.style.cssText = `
    all: initial !important;
    display: inline-block !important;
    width: 18px !important;
    height: 18px !important;
    background-image: url('${iconUrl}') !important;
    background-size: contain !important;
    background-repeat: no-repeat !important;
    background-position: center !important;
    flex-shrink: 0 !important;
    filter: ${isDarkTheme ? darkFilter : lightFilter} !important;
  `;
  icon.setAttribute('aria-label', altText);

  iconWrapper.appendChild(icon);

  const label = document.createElement('span');
  label.className = 'btn-label';
  label.style.cssText = `
    all: initial !important;
    display: inline !important;
    font-size: 13.5px !important;
    font-family: "Segoe UI Variable", "Segoe UI", sans-serif !important;
    font-weight: 400 !important;
    color: var(--icon-color) !important;
    white-space: nowrap !important;
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
    margin: 0 !important;
    box-shadow: none !important;
    text-shadow: none !important;
    line-height: 1.0 !important;
    letter-spacing: normal !important;
    text-transform: none !important;
  `;
  label.textContent = labelText;

  button.appendChild(iconWrapper);
  button.appendChild(label);
  wrapper.appendChild(button);

  wrapper.addEventListener('mouseenter', function() {
    button.style.setProperty('background-color', 'var(--bg-btn-hover)', 'important');
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    icon.style.setProperty('filter', isDark ? darkFilter : lightFilter, 'important');
  });

  wrapper.addEventListener('mouseleave', function() {
    button.style.setProperty('background-color', 'transparent', 'important');
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    icon.style.setProperty('filter', isDark ? darkFilter : lightFilter, 'important');
  });

  return wrapper;
}

function isSelectionInEditable() {
  const active = document.activeElement;
  if (!active) return false;
  if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') return true;
  if (active.isContentEditable) return true;
  return false;
}

async function getClipboardText() {
  const now = Date.now();
  if (now - clipboardCheckTime < CLIPBOARD_CACHE_MS) {
    return lastClipboardText;
  }
  try {
    const text = await navigator.clipboard.readText();
    lastClipboardText = text || '';
    clipboardCheckTime = now;
    return lastClipboardText;
  } catch {
    lastClipboardText = '';
    clipboardCheckTime = now;
    return '';
  }
}

async function hasClipboardText() {
  const text = await getClipboardText();
  return text && text.length > 0;
}

function handlePasteAction(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const active = savedInputElement || document.activeElement;

  if (!active) {
    removePopup();
    return;
  }

  navigator.clipboard.readText().then(function(text) {
    if (!text) {
      removePopup();
      return;
    }

    removePopup();

    setTimeout(function() {
      active.focus();

      if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') {
        const start = active.selectionStart || 0;
        const end = active.selectionEnd || 0;
        const value = active.value;
        const newValue = value.substring(0, start) + text + value.substring(end);
        active.value = newValue;
        active.selectionStart = start + text.length;
        active.selectionEnd = start + text.length;
        active.dispatchEvent(new Event('input', { bubbles: true }));
        active.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (active.isContentEditable) {
        document.execCommand('insertText', false, text);
      }
    }, 50);
  }).catch(function(err) {
    console.error('[MiniMenu] Paste error:', err);
    removePopup();
  });
}

function handleCutAction(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const active = savedInputElement || document.activeElement;

  if (!active) {
    removePopup();
    return;
  }

  if (!selectedText) {
    removePopup();
    return;
  }

  const text = selectedText;

  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
    const start = active.selectionStart || 0;
    const end = active.selectionEnd || 0;
    const value = active.value;
    active.value = value.substring(0, start) + value.substring(end);
    active.selectionStart = start;
    active.selectionEnd = start;
    active.dispatchEvent(new Event('input', { bubbles: true }));
    active.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (active && active.isContentEditable) {
    document.execCommand('delete');
  }

  removePopup();

  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
  }

  navigator.clipboard.writeText(text).catch(function(err) {
    console.error('[MiniMenu] clipboard write error:', err);
  });
}

function handleCopyAction() {
  if (!selectedText) return;
  const text = selectedText;
  removePopup();

  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
  }

  navigator.clipboard.writeText(text).catch(function() {});
}

function handleSearchAction() {
  if (!selectedText) return;
  const text = selectedText;
  removePopup();

  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
  }

  chrome.runtime.sendMessage({
    action: 'search_text',
    text: text
  }, function(response) {});
}

function handleShareAction() {
  if (!selectedText) return;
  const text = selectedText;
  const title = document.title || ' ';
  const url = window.location.href;
  removePopup();

  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
  }

  if (typeof navigator.share === 'function') {
    navigator.share({
      title: title,
      text: text,
      url: url
    }).catch(function(error) {
      if (error.name !== 'AbortError') {
        console.error('[MiniMenu] Share error:', error);
      }
    });
  }
}

function destroyPopup() {
  if (popup) {
    popup.remove();
    popup = null;
  }
}

function resetPopupTimer() {
  if (popupTimer) {
    clearTimeout(popupTimer);
    popupTimer = null;
  }
  if (popup) {
    popupTimer = setTimeout(function() {
      closedByTimer = true;
      removePopup();
    }, 10000);
  }
}

function injectStyles() {
  const styleId = 'text-mini-menu-styles';
  if (document.getElementById(styleId)) {
    return;
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    :root {
      --bg-popup: #ffffff;
      --border-popup: #d1d5db;
      --bg-btn-hover: #efefef;
      --icon-color: #4a4a4a;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg-popup: #1f1f1f;
        --border-popup: #4b4b4b;
        --bg-btn-hover: #404040;
        --icon-color: #d8d8d8;
      }
    }

    .text-mini-menu {
      position: absolute !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 6px !important;
      background: var(--bg-popup) !important;
      border: 1px solid var(--border-popup) !important;
      border-radius: 8px !important;
      padding: 8px 4px !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
      z-index: 2147483647 !important;
      pointer-events: auto !important;
      transition: background 0.2s, border-color 0.2s !important;
    }

    .menu-state {
      display: flex !important;
      flex-direction: column !important;
      gap: 4px !important;
    }

    .default-state {
      display: flex !important;
    }

    .hover-state {
      display: none !important;
    }

    .text-mini-menu:hover .default-state {
      display: none !important;
    }

    .text-mini-menu:hover .hover-state {
      display: flex !important;
    }

    .menu-btn-wrapper {
      display: flex !important;
      align-items: center !important;
      justify-content: flex-start !important;
      border-radius: 4px !important;
      transition: background-color 120ms ease !important;
      flex-shrink: 0 !important;
    }

    .menu-btn {
      display: flex !important;
      align-items: center !important;
      justify-content: flex-start !important;
      gap: 12px !important;

      height: 30px !important;
      padding: 4px 8px !important;
      margin: 0 !important;

      background: transparent !important;
      border: none !important;
      border-radius: 4px !important;

      cursor: pointer !important;
      outline: none !important;

      box-shadow: none !important;

      flex-shrink: 0 !important;
      width: 100% !important;
    }

    .menu-icon {
      display: inline-block !important;
      width: 18px !important;
      height: 18px !important;
      background-size: contain !important;
      background-repeat: no-repeat !important;
      background-position: center !important;
      flex-shrink: 0 !important;
      filter: invert(28%) sepia(0%) saturate(1703%) hue-rotate(268deg) brightness(90%) contrast(86%);
    }

    @media (prefers-color-scheme: dark) {
      .menu-icon {
        filter: invert(90%) sepia(99%) saturate(0%) hue-rotate(147deg) brightness(89%) contrast(90%);
      }
    }

    .btn-label {
      display: inline !important;
      font-size: 13.5px !important;
      font-family: "Segoe UI Variable", "Segoe UI", sans-serif !important;
      font-weight: 400 !important;
      color: var(--icon-color) !important;
      white-space: nowrap !important;
      background: transparent !important;
      border: none !important;
      padding: 0 !important;
      margin: 0 !important;
      box-shadow: none !important;
      text-shadow: none !important;
      line-height: 1.0 !important;
      letter-spacing: normal !important;
      text-transform: none !important;
    }
  `;
  document.head.appendChild(style);
}

function calculatePopupPosition(rects) {
  if (!rects || rects.length === 0) return null;

  const firstRect = rects[0];
  const lastRect = rects[rects.length - 1];

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scrollX = window.scrollX || window.pageXOffset || 0;
  const scrollY = window.scrollY || window.pageYOffset || 0;

  const popupWidth = popup ? popup.offsetWidth : 150;
  const popupHeight = popup ? popup.offsetHeight : 120;

  const gap = 2;
  const padding = 5;

  const spaceAbove = firstRect.top + scrollY - padding;
  const fitsAbove = spaceAbove >= popupHeight + gap;

  const firstCenterX = firstRect.left + firstRect.width / 2;
  const lastCenterX = lastRect.left + lastRect.width / 2;
  const avgCenterX = (firstCenterX + lastCenterX) / 2;

  let top;
  let anchorY;

  if (fitsAbove) {
    top = firstRect.top + scrollY - popupHeight - gap;
    anchorY = firstRect.top + scrollY;
  } else {
    top = lastRect.bottom + scrollY + gap;
    anchorY = lastRect.bottom + scrollY;
  }

  if (top < padding) {
    top = padding;
  } else if (top + popupHeight > viewportHeight + scrollY - padding) {
    top = viewportHeight + scrollY - popupHeight - padding;
  }

  let left = avgCenterX - popupWidth / 2;

  if (left < padding) {
    left = padding;
  } else if (left + popupWidth > viewportWidth - padding) {
    left = viewportWidth - popupWidth - padding;
  }

  lastPopupPosition = { top, left };
  return {
    top: top,
    left: left,
    anchorX: avgCenterX,
    anchorY: anchorY
  };
}

function getSelectionRects() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }

  let range;
  try {
    range = selection.getRangeAt(0);
  } catch (e) {
    return null;
  }

  const rects = range.getClientRects();
  if (!rects || rects.length === 0) {
    return null;
  }

  return rects;
}

function positionPopup() {
  if (!isContextValid() || !popup) return;

  if (savedMousePosition) {
    console.log('[MiniMenu] positionPopup - using mouse position');
    const popupRect = popup.getBoundingClientRect();
    if (!popupRect) return;

    const popupWidth = popupRect.width;
    const popupHeight = popupRect.height;
    const gap = 2;
    const padding = 5;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = savedMousePosition.y + gap;
    let left = savedMousePosition.x - popupWidth / 2;

    if (top + popupHeight > viewportHeight) {
      top = savedMousePosition.y - popupHeight - gap;
    }
    if (top < padding) {
      top = padding;
    }
    if (left < padding) {
      left = padding;
    }
    if (left + popupWidth > viewportWidth - padding) {
      left = viewportWidth - popupWidth - padding;
    }

    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
    popup.style.position = 'fixed';
    console.log('[MiniMenu] positionPopup - positioned at:', left, top);
    return;
  }

  const rects = getSelectionRects();
  if (!rects) {
    removePopup();
    return;
  }

  if (lastSelectionRects) {
    const prevRects = lastSelectionRects;
    const sameRects = rects.length === prevRects.length &&
      Array.from(rects).every((r, i) => {
        const p = prevRects[i];
        return r && p &&
          r.top === p.top &&
          r.left === p.left &&
          r.width === p.width &&
          r.height === p.height;
      });
    if (sameRects && lastPopupPosition) {
      popup.style.left = lastPopupPosition.left + 'px';
      popup.style.top = lastPopupPosition.top + 'px';
      return;
    }
  }
  lastSelectionRects = rects;

  const position = calculatePopupPosition(rects);
  if (!position) {
    removePopup();
    return;
  }

  popup.style.left = position.left + 'px';
  popup.style.top = position.top + 'px';
  lastPopupPosition = { top: position.top, left: position.left };
}

async function updateSelectionPopup() {
  if (isCreatingPopup) return;
  if (!selectedText) return;

  isCreatingPopup = true;

  try {
    if (popup) {
      destroyPopup();
    }
    await createPopup();
  } finally {
    isCreatingPopup = false;
  }
}

async function createPopup(event) {
  if (!isContextValid()) return;
  if (isClosing) return;

  closedByTimer = false;

  destroyPopup();
  resetPopupTimer();

  injectStyles();

  popup = document.createElement('div');
  popup.id = 'text-mini-menu';
  popup.className = 'text-mini-menu';

  const searchLabel = getMessage('search');
  const copyLabel = getMessage('copy');
  const shareLabel = getMessage('share') || 'Share';
  const pasteLabel = getMessage('paste') || 'Вставити';
  const cutLabel = getMessage('cut') || 'Вирізати';

  const defaultState = document.createElement('div');
  defaultState.className = 'menu-state default-state';

  const hoverState = document.createElement('div');
  hoverState.className = 'menu-state hover-state';

  const isEditable = isSelectionInEditable();

  if (isEditable) {
    const cutBtnDefault = createIconButton('icons/cut.svg', cutLabel);
    defaultState.appendChild(cutBtnDefault);

    const cutBtnHover = createLabeledButton('icons/cut.svg', cutLabel, cutLabel);
    hoverState.appendChild(cutBtnHover);

    const pasteBtnDefault = createIconButton('icons/paste.svg', pasteLabel);
    defaultState.appendChild(pasteBtnDefault);

    const pasteBtnHover = createLabeledButton('icons/paste.svg', pasteLabel, pasteLabel);
    hoverState.appendChild(pasteBtnHover);

    const copyBtnDefault = createIconButton('icons/copy.svg', copyLabel);
    defaultState.appendChild(copyBtnDefault);

    const copyBtnHover = createLabeledButton('icons/copy.svg', copyLabel, copyLabel);
    hoverState.appendChild(copyBtnHover);

    cutBtnDefault.addEventListener('mousedown', function(e) {
      savedInputElement = document.activeElement;
      e.preventDefault();
      e.stopPropagation();
      handleCutAction(e);
    });

    cutBtnHover.addEventListener('mousedown', function(e) {
      savedInputElement = document.activeElement;
      e.preventDefault();
      e.stopPropagation();
      handleCutAction(e);
    });

    pasteBtnDefault.addEventListener('mousedown', function(e) {
      savedInputElement = document.activeElement;
      e.preventDefault();
      e.stopPropagation();
      handlePasteAction(e);
    });

    pasteBtnHover.addEventListener('mousedown', function(e) {
      savedInputElement = document.activeElement;
      e.preventDefault();
      e.stopPropagation();
      handlePasteAction(e);
    });

    copyBtnDefault.addEventListener('click', function(e) {
      e.stopPropagation();
      handleCopyAction();
    });

    copyBtnHover.addEventListener('click', function(e) {
      e.stopPropagation();
      handleCopyAction();
    });

  } else {
    let shareBtnDefault = null;
    let shareBtnHover = null;
    if (typeof navigator.share === 'function') {
      shareBtnDefault = createIconButton('icons/share.svg', shareLabel);
      defaultState.appendChild(shareBtnDefault);

      shareBtnHover = createLabeledButton('icons/share.svg', shareLabel, shareLabel);
      hoverState.appendChild(shareBtnHover);
    }

    const copyBtnDefault = createIconButton('icons/copy.svg', copyLabel);
    defaultState.appendChild(copyBtnDefault);

    const searchBtnDefault = createIconButton('icons/search.svg', searchLabel);
    defaultState.appendChild(searchBtnDefault);

    const copyBtnHover = createLabeledButton('icons/copy.svg', copyLabel, copyLabel);
    hoverState.appendChild(copyBtnHover);

    const searchBtnHover = createLabeledButton('icons/search.svg', searchLabel, searchLabel);
    hoverState.appendChild(searchBtnHover);

    if (shareBtnDefault) {
      shareBtnDefault.addEventListener('click', function(e) {
        e.stopPropagation();
        handleShareAction();
      });
    }

    if (shareBtnHover) {
      shareBtnHover.addEventListener('click', function(e) {
        e.stopPropagation();
        handleShareAction();
      });
    }

    copyBtnDefault.addEventListener('click', function(e) {
      e.stopPropagation();
      handleCopyAction();
    });

    copyBtnHover.addEventListener('click', function(e) {
      e.stopPropagation();
      handleCopyAction();
    });

    searchBtnDefault.addEventListener('click', function(e) {
      e.stopPropagation();
      handleSearchAction();
    });

    searchBtnHover.addEventListener('click', function(e) {
      e.stopPropagation();
      handleSearchAction();
    });
  }

  popup.appendChild(defaultState);
  popup.appendChild(hoverState);

  popup.addEventListener('mouseenter', function() {
    resetPopupTimer();
  });

  popup.addEventListener('mouseleave', function() {
    resetPopupTimer();
  });

  popup.addEventListener('mousemove', function() {
    resetPopupTimer();
  });

  document.body.appendChild(popup);

  requestAnimationFrame(function() {
    positionPopup();
    resetPopupTimer();
  });
}

function removePopup() {
  if (isClosing) return;

  isClosing = true;

  if (popupTimer) {
    clearTimeout(popupTimer);
    popupTimer = null;
  }

  if (popup) {
    popup.style.opacity = '0';
  }

  destroyPopup();

  selectedText = '';
  lastSelectedText = '';
  lastPopupPosition = null;
  lastSelectionRects = null;
  savedInputElement = null;
  savedMousePosition = null;

  setTimeout(function() {
    closedByTimer = false;
    isClosing = false;
  }, 100);
}

function isPrintableKey(e) {
  if (e.ctrlKey || e.altKey || e.metaKey) return false;
  if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return false;
  if (e.key === 'Escape' || e.key === 'Tab') return true;
  if (e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End' || e.key === 'PageUp' || e.key === 'PageDown') return true;
  if (e.key === 'Backspace' || e.key === 'Delete') return true;
  if (e.key.length === 1) return true;
  return false;
}

function isFocusInEditable() {
  const active = document.activeElement;
  if (!active) return false;
  if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') return true;
  if (active.isContentEditable) return true;
  return false;
}

function handleReposition() {
  if (popup) {
    positionPopup();
  }
}

document.addEventListener('keydown', function(e) {
  if (!isContextValid()) return;
  if (isClosing) return;
  if (!popup) return;

  if (isFocusInEditable()) return;

  if (e.ctrlKey || e.altKey || e.metaKey) {
    if (e.key === 'c' || e.key === 'C' || e.key === 'a' || e.key === 'A' || e.key === 'f' || e.key === 'F' || e.key === 'v' || e.key === 'V') {
      return;
    }
    return;
  }

  if (isPrintableKey(e)) {
    e.preventDefault();
    e.stopPropagation();
    removePopup();
  }
}, true);

document.addEventListener('scroll', function() {
  handleReposition();
}, true);

document.addEventListener('resize', function() {
  handleReposition();
});

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', function() {
    handleReposition();
  });
  window.visualViewport.addEventListener('scroll', function() {
    handleReposition();
  });
}

document.addEventListener('mousedown', function(e) {
  if (!isContextValid()) return;

  if (popup && popup.contains(e.target)) {
    return;
  }

  isMouseSelection = true;

  if (isFocusInEditable()) {
    if (popup) {
      removePopup();
    }
    return;
  }

  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) {
    const text = selection.toString().trim();
    if (text && text === lastSelectedText) {
      const range = selection.getRangeAt(0);
      if (range) {
        const rect = range.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
          clickOnSelectedText = true;
        }
      }
      return;
    }
  }

  if (popup && !popup.contains(e.target)) {
    ignoreNextMouseUp = true;
    lastSelectedText = '';
    selectedText = '';
    closedByTimer = false;
    removePopup();
  }
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Shift' || e.key.startsWith('Arrow')) {
    isMouseSelection = false;
  }
});

document.addEventListener('selectionchange', function() {
  if (!isContextValid()) return;
  if (isClosing) return;

  if (!isMouseSelection) {
    return;
  }

  const now = Date.now();
  if (now - lastSelectionChange < 100) {
    return;
  }
  lastSelectionChange = now;

  if (selectionTimer) {
    clearTimeout(selectionTimer);
  }

  selectionTimer = setTimeout(async function() {
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : '';

    if (!text) {
      if (popup) {
        removePopup();
      }
      return;
    }

    if (text === lastSelectedText) {
      if (popup) {
        positionPopup();
        resetPopupTimer();
      }
      return;
    }

    lastSelectedText = text;
    selectedText = text;

    await updateSelectionPopup();
  }, 300);
});

document.addEventListener('mouseup', async function(e) {
  if (!isContextValid()) return;

  if (clickOnSelectedText) {
    clickOnSelectedText = false;
    if (popup) {
      removePopup();
    }
    return;
  }

  if (ignoreNextMouseUp) {
    ignoreNextMouseUp = false;
    return;
  }

  if (isClosing) return;

  if (closedByTimer) {
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
    if (popup) {
      removePopup();
    }
    return;
  }

  const selection = window.getSelection();
  const text = selection ? selection.toString().trim() : '';

  if (!text) {
    if (popup) {
      removePopup();
    }
    return;
  }

  if (text === lastSelectedText) {
    if (popup) {
      positionPopup();
      resetPopupTimer();
    }
    return;
  }

  lastSelectedText = text;
  selectedText = text;

  await updateSelectionPopup();
});

document.addEventListener('dblclick', async function(e) {
  console.log('[MiniMenu] dblclick triggered');
  if (!isContextValid()) {
    console.log('[MiniMenu] dblclick - context invalid');
    return;
  }
  if (isClosing) {
    console.log('[MiniMenu] dblclick - isClosing');
    return;
  }
  if (isCreatingPopup) {
    console.log('[MiniMenu] dblclick - isCreatingPopup');
    return;
  }

  const target = e.target;
  console.log('[MiniMenu] dblclick - target:', target.tagName, target.className);
  if (!target) {
    console.log('[MiniMenu] dblclick - no target');
    return;
  }

  const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
  console.log('[MiniMenu] dblclick - isInput:', isInput);
  if (!isInput) {
    console.log('[MiniMenu] dblclick - not an input field');
    return;
  }

  const selection = window.getSelection();
  const selText = selection ? selection.toString().trim() : '';
  console.log('[MiniMenu] dblclick - selText:', selText);

  if (selText && selText.length > 0) {
    console.log('[MiniMenu] dblclick - has selected text, skipping');
    return;
  }

  const hasText = await hasClipboardText();
  console.log('[MiniMenu] dblclick - hasText:', hasText);
  if (!hasText) {
    console.log('[MiniMenu] dblclick - clipboard empty');
    return;
  }

  e.preventDefault();
  console.log('[MiniMenu] dblclick - prevented default');

  savedInputElement = target;
  console.log('[MiniMenu] dblclick - savedInputElement:', savedInputElement);

  savedMousePosition = { x: e.clientX, y: e.clientY };
  console.log('[MiniMenu] dblclick - savedMousePosition:', savedMousePosition);

  lastSelectedText = '';
  selectedText = '';

  if (popup) {
    console.log('[MiniMenu] dblclick - destroying existing popup');
    destroyPopup();
  }

  console.log('[MiniMenu] dblclick - creating popup');
  await createPopup();
  console.log('[MiniMenu] dblclick - popup created');
});