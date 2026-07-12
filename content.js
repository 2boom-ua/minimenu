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

  const label = document.createElement('span');
  label.className = 'btn-label';
  label.textContent = labelText;

  button.appendChild(icon);
  button.appendChild(label);

  return button;
}

function handleCopyAction() {
  if (!selectedText) return;

  navigator.clipboard.writeText(selectedText).then(function() {
    removePopup();
  }).catch(function() {
    removePopup();
  });
}

function handleSearchAction() {
  if (!selectedText) return;

  chrome.runtime.sendMessage({
    action: 'search_text',
    text: selectedText
  }, function(response) {
    // Message sent
  });

  removePopup();
}

function handleShareAction() {
  if (!selectedText) return;

  if (typeof navigator.share === 'function') {
    navigator.share({
      title: document.title || ' ',
      text: selectedText,
      url: window.location.href
    }).then(function() {
      removePopup();
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

function createPopup(event) {
  if (!isContextValid()) return;
  if (isClosing) return;

  closedByTimer = false;

  destroyPopup();
  resetPopupTimer();

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

  // Очищуємо виділення
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
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