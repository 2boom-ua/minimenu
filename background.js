// Text Mini Menu - Background Service Worker
// Copyright 2boom, 2026

importScripts('storage-utils.js');

console.log('[MiniMenu] Background service worker loaded');

const MENU_ID = 'text_mini_menu';
const MENU_ID_SITE = 'toggle_site';
const MENU_ID_EDITABLE = 'toggle_editable';
const MENU_ID_LAYOUT = 'toggle_layout';
const STORAGE_KEY = 'disabledSites';
const EDITABLE_DISABLED_KEY = 'disabledEditableSites';
const LAYOUT_KEY = 'horizontalLayout';

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
  getSyncedValue(STORAGE_KEY, []).then(function(value) {
    callback(value);
  });
}

// Get disabled editable sites from storage
function getDisabledEditableSites(callback) {
  getSyncedValue(EDITABLE_DISABLED_KEY, []).then(function(value) {
    callback(value);
  });
}

// Get layout setting
function getLayout(callback) {
  getSyncedValue(LAYOUT_KEY, false).then(function(value) {
    callback(value);
  });
}

// Save layout setting
function saveLayout(value, callback) {
  setSyncedValue(LAYOUT_KEY, value).then(function() {
    if (callback) callback();
  });
}

// Save disabled sites to storage
function saveDisabledSites(sites, callback) {
  setSyncedValue(STORAGE_KEY, sites).then(function() {
    if (callback) callback();
  });
}

// Save disabled editable sites to storage
function saveDisabledEditableSites(sites, callback) {
  setSyncedValue(EDITABLE_DISABLED_KEY, sites).then(function() {
    if (callback) callback();
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
    const actionKey = isDisabled ? 'enable_site' : 'disable_site';
    const title = chrome.i18n.getMessage(actionKey) || (isDisabled ? 'Enable on this site' : 'Disable on this site');
    
    chrome.contextMenus.update(MENU_ID_SITE, {
      title: title
    }, function() {
      if (chrome.runtime.lastError) {
        chrome.contextMenus.create({
          id: MENU_ID_SITE,
          parentId: MENU_ID,
          title: title,
          contexts: ['page', 'selection', 'editable', 'frame']
        }, function() {
          if (chrome.runtime.lastError) {
            // Menu may already exist
          }
        });
      }
    });
  });
}

function createOrUpdateEditableMenu(hostname) {
  if (!hostname) {
    getCurrentTabHostname(function(h) {
      if (h) {
        createOrUpdateEditableMenuInternal(h);
      }
    });
    return;
  }
  createOrUpdateEditableMenuInternal(hostname);
}

function createOrUpdateEditableMenuInternal(hostname) {
  getDisabledEditableSites(function(sites) {
    const isDisabled = sites && sites.includes(hostname);
    const actionKey = isDisabled ? 'enable_editable' : 'disable_editable';
    const title = chrome.i18n.getMessage(actionKey) || (isDisabled ? 'Enable in editable fields' : 'Disable in editable fields');
    
    chrome.contextMenus.update(MENU_ID_EDITABLE, {
      title: title
    }, function() {
      if (chrome.runtime.lastError) {
        chrome.contextMenus.create({
          id: MENU_ID_EDITABLE,
          parentId: MENU_ID,
          title: title,
          contexts: ['page', 'selection', 'editable', 'frame']
        }, function() {
          if (chrome.runtime.lastError) {
            // Menu may already exist
          }
        });
      }
    });
  });
}

function createOrUpdateLayoutMenu() {
  getLayout(function(isHorizontal) {
    const actionKey = isHorizontal ? 'switch_vertical' : 'switch_horizontal';
    const title = chrome.i18n.getMessage(actionKey) || (isHorizontal ? 'Switch to vertical layout' : 'Switch to horizontal layout');
    
    chrome.contextMenus.update(MENU_ID_LAYOUT, {
      title: title
    }, function() {
      if (chrome.runtime.lastError) {
        chrome.contextMenus.create({
          id: MENU_ID_LAYOUT,
          parentId: MENU_ID,
          title: title,
          contexts: ['page', 'selection', 'editable', 'frame']
        }, function() {
          if (chrome.runtime.lastError) {
            // Menu may already exist
          }
        });
      }
    });
  });
}

// Initialize menu when service worker starts
function initializeMenu() {
  const parentTitle = chrome.i18n.getMessage('menu_title') || 'Text Mini Menu';
  
  // Remove existing menu to rebuild
  chrome.contextMenus.remove(MENU_ID, function() {
    if (chrome.runtime.lastError) {
      // Menu doesn't exist, ignore
    }
    // Create parent menu
    chrome.contextMenus.create({
      id: MENU_ID,
      title: parentTitle,
      contexts: ['page', 'selection', 'editable', 'frame']
    }, function() {
      if (chrome.runtime.lastError) {
        // Menu may already exist
      }
      // Create child menus after parent is created
      createAllChildMenus();
    });
  });
}

function createAllChildMenus() {
  getCurrentTabHostname(function(hostname) {
    // Site toggle menu
    const defaultSiteTitle = chrome.i18n.getMessage('disable_site') || 'Disable on this site';
    chrome.contextMenus.create({
      id: MENU_ID_SITE,
      parentId: MENU_ID,
      title: defaultSiteTitle,
      contexts: ['page', 'selection', 'editable', 'frame']
    }, function() {
      if (chrome.runtime.lastError) {
        // Menu may already exist
      }
    });
    
    // Editable toggle menu
    const defaultEditableTitle = chrome.i18n.getMessage('disable_editable') || 'Disable in editable fields';
    chrome.contextMenus.create({
      id: MENU_ID_EDITABLE,
      parentId: MENU_ID,
      title: defaultEditableTitle,
      contexts: ['page', 'selection', 'editable', 'frame']
    }, function() {
      if (chrome.runtime.lastError) {
        // Menu may already exist
      }
    });
    
    // Layout toggle menu
    getLayout(function(isHorizontal) {
      const actionKey = isHorizontal ? 'switch_vertical' : 'switch_horizontal';
      const title = chrome.i18n.getMessage(actionKey) || (isHorizontal ? 'Switch to vertical layout' : 'Switch to horizontal layout');
      chrome.contextMenus.create({
        id: MENU_ID_LAYOUT,
        parentId: MENU_ID,
        title: title,
        contexts: ['page', 'selection', 'editable', 'frame']
      }, function() {
        if (chrome.runtime.lastError) {
          // Menu may already exist
        }
      });
    });
    
    if (hostname) {
      createOrUpdateMenu(hostname);
      createOrUpdateEditableMenu(hostname);
    }
  });
}

// Handle context menu click
function handleMenuClick(info, tab) {
  if (info.menuItemId === MENU_ID_SITE) {
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
        createOrUpdateMenu(hostname);
      });
    });
    return;
  }
  
  if (info.menuItemId === MENU_ID_EDITABLE) {
    const hostname = getHostname(tab.url);
    if (!hostname) {
      return;
    }
    
    getDisabledEditableSites(function(sites) {
      let newSites = sites || [];
      const index = newSites.indexOf(hostname);
      
      if (index > -1) {
        newSites.splice(index, 1);
      } else {
        newSites.push(hostname);
      }
      
      saveDisabledEditableSites(newSites, function() {
        createOrUpdateEditableMenu(hostname);
      });
    });
    return;
  }
  
  if (info.menuItemId === MENU_ID_LAYOUT) {
    getLayout(function(isHorizontal) {
      const newValue = !isHorizontal;
      saveLayout(newValue, function() {
        createOrUpdateLayoutMenu();
      });
    });
    return;
  }
}

// Handle tab updates to refresh menu title
function handleTabUpdated(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.active) {
    let url = changeInfo.url || tab.url;
    if (!url) {
      chrome.tabs.get(tabId, function(fullTab) {
        if (chrome.runtime.lastError) {
          // Tab no longer exists
          return;
        }
        if (fullTab && fullTab.url) {
          const hostname = getHostname(fullTab.url);
          if (hostname) {
            createOrUpdateMenu(hostname);
            createOrUpdateEditableMenu(hostname);
          }
        }
      });
      return;
    }
    const hostname = getHostname(url);
    if (hostname) {
      createOrUpdateMenu(hostname);
      createOrUpdateEditableMenu(hostname);
    }
  }
}

// Handle tab activation
function handleTabActivated(activeInfo) {
  chrome.tabs.get(activeInfo.tabId, function(tab) {
    if (chrome.runtime.lastError) {
      // Tab no longer exists
      return;
    }
    if (tab && tab.url) {
      const hostname = getHostname(tab.url);
      if (hostname) {
        createOrUpdateMenu(hostname);
        createOrUpdateEditableMenu(hostname);
      }
    }
  });
}

// Handle storage changes
function handleStorageChanged(changes, namespace) {
  if (namespace === 'sync' || namespace === 'local') {
    if (changes[STORAGE_KEY] || changes[EDITABLE_DISABLED_KEY]) {
      getCurrentTabHostname(function(hostname) {
        if (hostname) {
          createOrUpdateMenu(hostname);
          createOrUpdateEditableMenu(hostname);
        }
      });
    }
    if (changes[LAYOUT_KEY]) {
      createOrUpdateLayoutMenu();
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
  
  if (message.action === 'get_disabled_editable_sites') {
    getDisabledEditableSites(function(sites) {
      sendResponse({ sites: sites || [] });
    });
    return true;
  }
  
  if (message.action === 'get_layout') {
    getLayout(function(isHorizontal) {
      sendResponse({ horizontal: isHorizontal });
    });
    return true;
  }
  
  if (message.action === 'content_script_ready' && message.hostname) {
    createOrUpdateMenu(message.hostname);
    createOrUpdateEditableMenu(message.hostname);
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

// Setup event listeners
chrome.tabs.onUpdated.addListener(handleTabUpdated);
chrome.tabs.onActivated.addListener(handleTabActivated);
chrome.storage.onChanged.addListener(handleStorageChanged);

console.log('[MiniMenu] Background service worker initialized');