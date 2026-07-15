// Text Mini Menu
// Copyright 2boom, 2026

let popup = null;
let selectedText = '';
let isClosing = false;
let ignoreNextMouseUp = false;
let lastSelectedText = '';
let popupTimer = null;
let closedByTimer = false;

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
  const style = document.createElement('style');
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

function createPopup(event) {
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

  const defaultState = document.createElement('div');
  defaultState.className = 'menu-state default-state';

  const hoverState = document.createElement('div');
  hoverState.className = 'menu-state hover-state';

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

  popup.appendChild(defaultState);
  popup.appendChild(hoverState);

  if (shareBtnDefault) {
    shareBtnDefault.addEventListener('click', function(e) {
      e.stopPropagation();
      handleShareAction();
    });
  }

  copyBtnDefault.addEventListener('click', function(e) {
    e.stopPropagation();
    handleCopyAction();
  });

  searchBtnDefault.addEventListener('click', function(e) {
    e.stopPropagation();
    handleSearchAction();
  });

  if (shareBtnHover) {
    shareBtnHover.addEventListener('click', function(e) {
      e.stopPropagation();
      handleShareAction();
    });
  }

  copyBtnHover.addEventListener('click', function(e) {
    e.stopPropagation();
    handleCopyAction();
  });

  searchBtnHover.addEventListener('click', function(e) {
    e.stopPropagation();
    handleSearchAction();
  });

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
  positionPopup();
  resetPopupTimer();
}

function positionPopup() {
  if (!isContextValid() || !popup) return;

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    removePopup();
    return;
  }

  let range;
  try {
    range = selection.getRangeAt(0);
  } catch (e) {
    removePopup();
    return;
  }

  const rect = range.getBoundingClientRect();
  if (!rect || rect.width === 0 || rect.height === 0) {
    removePopup();
    return;
  }

  const centerX = rect.left + window.scrollX + rect.width / 2;
  const topY = rect.top + window.scrollY;

  requestAnimationFrame(function() {
    if (!isContextValid() || !popup) return;

    const popupRect = popup.getBoundingClientRect();
    if (!popupRect) return;

    const popupHeight = popupRect.height;
    const gap = 5;
    const selectionTop = rect.top;
    
    let top = topY;
    
    if (selectionTop - popupHeight - gap > 0) {
    top = topY - popupHeight - gap;
    } else {
    top = topY + rect.height + gap;
    }

    if (top < 0) {
      top = 10;
    }

    const viewportWidth = window.innerWidth;
    const padding = 5;
    let left = centerX - popupRect.width / 2;

    if (left < padding) {
      left = padding;
    }
    if (left + popupRect.width > viewportWidth - padding) {
      left = viewportWidth - popupRect.width - padding;
    }

    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
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

document.addEventListener('mouseup', function(e) {
  if (!isContextValid()) return;

  if (ignoreNextMouseUp) {
    ignoreNextMouseUp = false;
    return;
  }

  if (isClosing) return;

  if (isFocusInEditable()) {
    return;
  }

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

  if (popup) {
    destroyPopup();
  }

  createPopup(e);
});

document.addEventListener('mousedown', function(e) {
  if (!isContextValid()) return;

  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) {
    const text = selection.toString().trim();
    if (text && text === lastSelectedText) {
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