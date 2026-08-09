// Text Mini Menu - Background Service Worker
// Copyright 2boom, 2026

console.log('[MiniMenu] Background service worker loaded');

const MENU_ID = 'toggle_site';
const STORAGE_KEY = 'disabledSites';

// Helper: get hostname without www.
function getHostname(url) {
  try {
    const urlObj = new URL(url);
    let hostname = urlObj.hostname;
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    return hostname;
  } catch (e) {
    return null;
  }
}

// Helper: get current tab hostname
function getCurrentTabHostname(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (!tabs || tabs.length === 0 || !tabs[0].url) {
      callback(null);
      return;
    }
    callback(getHostname(tabs[0].url));
  });
}

// Get disabled sites from storage
function getDisabledSites(callback) {
  chrome.storage.sync.get([STORAGE_KEY], function(result) {
    if (chrome.runtime.lastError || !result[STORAGE_KEY]) {
      chrome.storage.local.get([STORAGE_KEY], function(localResult) {
        if (chrome.runtime.lastError || !localResult[STORAGE_KEY]) {
          callback([]);
        } else {
          callback(localResult[STORAGE_KEY]);
        }
      });
    } else {
      callback(result[STORAGE_KEY]);
    }
  });
}

// Save disabled sites to storage
function saveDisabledSites(sites, callback) {
  const data = {};
  data[STORAGE_KEY] = sites;
  chrome.storage.sync.set(data, function() {
    if (chrome.runtime.lastError) {
      chrome.storage.local.set(data, function() {
        if (callback) callback();
      });
    } else {
      if (callback) callback();
    }
  });
}

// Create or update context menu with correct title
function createOrUpdateMenu(hostname) {
  if (!hostname) {
    getCurrentTabHostname(function(h) {
      if (h) {
        createOrUpdateMenuInternal(h);
      }
    });
    return;
  }
  createOrUpdateMenuInternal(hostname);
}

function createOrUpdateMenuInternal(hostname) {
  getDisabledSites(function(sites) {
    const isDisabled = sites && sites.includes(hostname);
    const actionKey = isDisabled ? 'enable' : 'disable';
    const actionText = chrome.i18n.getMessage(actionKey) || (isDisabled ? 'Enable' : 'Disable');
    const title = actionText + ' Text Mini Menu';
    
    chrome.contextMenus.remove(MENU_ID, function() {
      if (chrome.runtime.lastError) {
        // Menu doesn't exist, ignore
      }
      chrome.contextMenus.create({
        id: MENU_ID,
        title: title,
        contexts: ['page', 'selection', 'editable', 'frame']
      }, function() {
        if (chrome.runtime.lastError) {
          // Menu may already exist
        }
      });
    });
  });
}

// Initialize menu when service worker starts
function initializeMenu() {
  getCurrentTabHostname(function(hostname) {
    if (hostname) {
      createOrUpdateMenu(hostname);
    } else {
      // Create default menu, then try to update immediately
      const defaultAction = chrome.i18n.getMessage('disable') || 'Disable';
      chrome.contextMenus.remove(MENU_ID, function() {
        if (chrome.runtime.lastError) {
          // Menu doesn't exist, ignore
        }
        chrome.contextMenus.create({
          id: MENU_ID,
          title: defaultAction + ' Text Mini Menu',
          contexts: ['page', 'selection', 'editable', 'frame']
        }, function() {
          if (chrome.runtime.lastError) {
            // Menu may already exist
          }
          // Immediately try to update with correct status
          getCurrentTabHostname(function(h) {
            if (h) {
              createOrUpdateMenu(h);
            }
          });
        });
      });
    }
  });
}

// Handle context menu click
function handleMenuClick(info, tab) {
  if (info.menuItemId !== MENU_ID) return;
  
  const hostname = getHostname(tab.url);
  if (!hostname) {
    return;
  }
  
  getDisabledSites(function(sites) {
    let newSites = sites || [];
    const index = newSites.indexOf(hostname);
    
    if (index > -1) {
      newSites.splice(index, 1);
    } else {
      newSites.push(hostname);
    }
    
    saveDisabledSites(newSites, function() {
      // Update menu title immediately
      createOrUpdateMenu(hostname);
    });
  });
}

// Handle tab updates to refresh menu title
function handleTabUpdated(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.active) {
    let url = changeInfo.url || tab.url;
    if (!url) {
      chrome.tabs.get(tabId, function(fullTab) {
        if (fullTab && fullTab.url) {
          const hostname = getHostname(fullTab.url);
          if (hostname) {
            createOrUpdateMenu(hostname);
          }
        }
      });
      return;
    }
    const hostname = getHostname(url);
    if (hostname) {
      createOrUpdateMenu(hostname);
    }
  }
}

// Handle tab activation
function handleTabActivated(activeInfo) {
  chrome.tabs.get(activeInfo.tabId, function(tab) {
    if (tab && tab.url) {
      const hostname = getHostname(tab.url);
      if (hostname) {
        createOrUpdateMenu(hostname);
      }
    }
  });
}

// Handle storage changes
function handleStorageChanged(changes, namespace) {
  if (namespace === 'sync' || namespace === 'local') {
    if (changes[STORAGE_KEY]) {
      getCurrentTabHostname(function(hostname) {
        if (hostname) {
          createOrUpdateMenu(hostname);
        }
      });
    }
  }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'search_text' && message.text) {
    
    try {
      chrome.search.query({
        text: message.text,
        disposition: 'NEW_TAB'
      }, function(result) {
        if (chrome.runtime.lastError) {
          // Search error
        }
      });
    } catch (e) {
      // Search exception
    }
    
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === 'get_disabled_sites') {
    getDisabledSites(function(sites) {
      sendResponse({ sites: sites || [] });
    });
    return true;
  }
  
  if (message.action === 'content_script_ready' && message.hostname) {
    createOrUpdateMenu(message.hostname);
    sendResponse({ success: true });
    return true;
  }
});

// Register context menu click handler
chrome.contextMenus.onClicked.addListener(handleMenuClick);

// Initialize
chrome.runtime.onInstalled.addListener(function() {
  initializeMenu();
});

// Also initialize when service worker starts
initializeMenu();

// Setup event listeners
chrome.tabs.onUpdated.addListener(handleTabUpdated);
chrome.tabs.onActivated.addListener(handleTabActivated);
chrome.storage.onChanged.addListener(handleStorageChanged);

console.log('[MiniMenu] Background service worker initialized');