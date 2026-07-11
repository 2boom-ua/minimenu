// Text Mini Menu - Background Service Worker
// Copyright 2boom, 2026

console.log('[MiniMenu] Background service worker loaded');

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'search_text' && message.text) {
    console.log('[MiniMenu] Background: search request for:', message.text);
    
    try {
      chrome.search.query({
        text: message.text,
        disposition: 'NEW_TAB'
      }, function(result) {
        if (chrome.runtime.lastError) {
          console.warn('[MiniMenu] Background: search error:', chrome.runtime.lastError);
        } else {
          console.log('[MiniMenu] Background: search executed successfully');
        }
      });
    } catch (e) {
      console.warn('[MiniMenu] Background: search exception:', e);
    }
    
    sendResponse({ success: true });
    return true;
  }
});