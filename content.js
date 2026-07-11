// Text Mini Menu
// Copyright 2boom, 2026

let popup = null;
let selectedText = '';
let isClosing = false;
let ignoreNextMouseUp = false;
let lastSelectedText = '';
let popupTimer = null;

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

function isURL(text) {
  if (!text) return false;

  let cleanText = text.trim();
  cleanText = cleanText.replace(/^["']+|["']+$/g, '');
  cleanText = cleanText.replace(/^\(+|\)+$/g, '');
  cleanText = cleanText.replace(/^\[+|\]+$/g, '');

  if (!cleanText) return false;
  if (/\s/.test(cleanText)) return false;

  const urlPattern = /^(https?:\/\/|www\.)[^\s<>"']+$/i;
  if (urlPattern.test(cleanText)) {
    return true;
  }

  const domainPattern = /^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}(?:\/.*)?$/;
  if (domainPattern.test(cleanText) && cleanText.includes('.')) {
    const parts = cleanText.split('.');
    if (parts.length >= 2 && parts[parts.length - 1].length >= 2) {
      return true;
    }
  }

  return false;
}

function normalizePhone(text) {
  return text.replace(/[\s\-\(\)]/g, '');
}

function isValidPhone(text) {
  const normalized = normalizePhone(text);
  const phonePattern = /^\+?\d{7,15}$/;
  return phonePattern.test(normalized);
}

function isValidEmail(text) {
  if (!text) return false;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(text.trim());
}

function normalizePlainText(text) {
  return text
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

function getCleanUrl(text) {
  let url = text.trim();
  url = url.replace(/^["']+|["']+$/g, '');
  url = url.replace(/^\(+|\)+$/g, '');
  url = url.replace(/^\[+|\]+$/g, '');

  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  return url;
}

function handlePhoneAction() {
  if (!selectedText) return;

  const normalized = normalizePhone(selectedText);

  navigator.clipboard.writeText(normalized).then(function() {
    window.location.href = 'tel:' + normalized;
    setTimeout(removePopup, 50);
  }).catch(function() {
    window.location.href = 'tel:' + normalized;
    setTimeout(removePopup, 50);
  });
}

function handleEmailAction() {
  if (!selectedText) return;

  const email = selectedText.trim();

  navigator.clipboard.writeText(email).then(function() {
    window.location.href = 'mailto:' + email;
    setTimeout(removePopup, 50);
  }).catch(function() {
    window.location.href = 'mailto:' + email;
    setTimeout(removePopup, 50);
  });
}

function handleOpenUrlAction() {
  if (!selectedText) return;

  const url = getCleanUrl(selectedText);
  window.open(url, '_blank');
  setTimeout(removePopup, 50);
}

function handleCopyPlainAction() {
  if (!selectedText) return;

  const normalized = normalizePlainText(selectedText);

  if (normalized) {
    navigator.clipboard.writeText(normalized).then(function() {
      removePopup();
    }).catch(function() {
      removePopup();
    });
  } else {
    removePopup();
  }
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
      removePopup();
    }, 10000);
  }
}

function createPopup(event) {
  if (!isContextValid()) return;
  if (isClosing) return;

  destroyPopup();
  resetPopupTimer();

  popup = document.createElement('div');
  popup.id = 'text-mini-menu';
  popup.className = 'text-mini-menu';

  const isUrl = isURL(selectedText);
  const isPhone = isValidPhone(selectedText);
  const isEmail = isValidEmail(selectedText);

  const searchLabel = getMessage('search');
  const copyLabel = getMessage('copy');
  const copyPlainLabel = getMessage('copy_plain');
  const openLinkLabel = getMessage('open_link');
  const callNumberLabel = getMessage('call_number');
  const sendEmailLabel = getMessage('send_email') || 'Send email';

  const defaultState = document.createElement('div');
  defaultState.className = 'menu-state default-state';

  const hoverState = document.createElement('div');
  hoverState.className = 'menu-state hover-state';

  let callBtnDefault = null;
  let emailBtnDefault = null;
  let openBtnDefault = null;

  let callBtnHover = null;
  let emailBtnHover = null;
  let openBtnHover = null;

  if (isPhone) {
    callBtnDefault = createIconButton('icons/phone.svg', callNumberLabel);
    defaultState.appendChild(callBtnDefault);

    callBtnHover = createLabeledButton('icons/phone.svg', callNumberLabel, callNumberLabel);
    hoverState.appendChild(callBtnHover);
  }

  if (isEmail) {
    emailBtnDefault = createIconButton('icons/email.svg', sendEmailLabel);
    defaultState.appendChild(emailBtnDefault);

    emailBtnHover = createLabeledButton('icons/email.svg', sendEmailLabel, sendEmailLabel);
    hoverState.appendChild(emailBtnHover);
  }

  if (isUrl) {
    openBtnDefault = createIconButton('icons/link.svg', openLinkLabel);
    defaultState.appendChild(openBtnDefault);

    openBtnHover = createLabeledButton('icons/link.svg', openLinkLabel, openLinkLabel);
    hoverState.appendChild(openBtnHover);
  }

  const copyPlainBtnDefault = createIconButton('icons/plain.svg', copyPlainLabel);
  defaultState.appendChild(copyPlainBtnDefault);

  const copyBtnDefault = createIconButton('icons/copy.svg', copyLabel);
  defaultState.appendChild(copyBtnDefault);

  const searchBtnDefault = createIconButton('icons/search.svg', searchLabel);
  defaultState.appendChild(searchBtnDefault);

  const copyPlainBtnHover = createLabeledButton('icons/plain.svg', copyPlainLabel, copyPlainLabel);
  hoverState.appendChild(copyPlainBtnHover);

  const copyBtnHover = createLabeledButton('icons/copy.svg', copyLabel, copyLabel);
  hoverState.appendChild(copyBtnHover);

  const searchBtnHover = createLabeledButton('icons/search.svg', searchLabel, searchLabel);
  hoverState.appendChild(searchBtnHover);

  popup.appendChild(defaultState);
  popup.appendChild(hoverState);

  if (isPhone && callBtnDefault) {
    callBtnDefault.addEventListener('click', function(e) {
      e.stopPropagation();
      handlePhoneAction();
    });
  }

  if (isEmail && emailBtnDefault) {
    emailBtnDefault.addEventListener('click', function(e) {
      e.stopPropagation();
      handleEmailAction();
    });
  }

  if (isUrl && openBtnDefault) {
    openBtnDefault.addEventListener('click', function(e) {
      e.stopPropagation();
      handleOpenUrlAction();
    });
  }

  copyPlainBtnDefault.addEventListener('click', function(e) {
    e.stopPropagation();
    handleCopyPlainAction();
  });

  copyBtnDefault.addEventListener('click', function(e) {
    e.stopPropagation();
    handleCopyAction();
  });

  searchBtnDefault.addEventListener('click', function(e) {
    e.stopPropagation();
    handleSearchAction();
  });

  if (isPhone && callBtnHover) {
    callBtnHover.addEventListener('click', function(e) {
      e.stopPropagation();
      handlePhoneAction();
    });
  }

  if (isEmail && emailBtnHover) {
    emailBtnHover.addEventListener('click', function(e) {
      e.stopPropagation();
      handleEmailAction();
    });
  }

  if (isUrl && openBtnHover) {
    openBtnHover.addEventListener('click', function(e) {
      e.stopPropagation();
      handleOpenUrlAction();
    });
  }

  copyPlainBtnHover.addEventListener('click', function(e) {
    e.stopPropagation();
    handleCopyPlainAction();
  });

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
    const cursorY = rect.top;

    let top = topY;

    if (cursorY - popupHeight - gap > 0) {
      top = topY - popupHeight - gap;
    } else {
      top = topY + rect.height + gap;
    }

    if (top < 0) {
      top = 10;
    }

    const left = centerX - popupRect.width / 2;

    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
  });
}

function removePopup() {
  if (isClosing) return;

  isClosing = true;

  resetPopupTimer();

  destroyPopup();

  selectedText = '';
  lastSelectedText = '';

  setTimeout(function() {
    isClosing = false;
  }, 100);
}

// ==================== KEYBOARD ====================

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

// ==================== MOUSE EVENT HANDLERS ====================

document.addEventListener('mouseup', function(e) {
  if (!isContextValid()) return;

  if (ignoreNextMouseUp) {
    ignoreNextMouseUp = false;
    return;
  }

  if (isClosing) return;

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
    removePopup();
  }
});
