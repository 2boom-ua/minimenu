// Storage utilities for Text Mini Menu
// Copyright 2boom, 2026

/**
 * Checks if extension context is still valid
 * @returns {boolean}
 */
function isExtensionContextValid() {
    try {
        return !!(chrome.runtime && chrome.runtime.id);
    } catch (e) {
        return false;
    }
}

/**
 * Reads value from chrome.storage.sync with fallback to chrome.storage.local.
 * @param {string} key
 * @param {*} defaultValue - returned if value is absent in both storages
 * @returns {Promise<*>}
 */
function getSyncedValue(key, defaultValue) {
    return new Promise(function(resolve) {
        if (!isExtensionContextValid()) {
            resolve(defaultValue);
            return;
        }

        chrome.storage.sync.get([key], function(result) {
            if (chrome.runtime.lastError || !(key in result) || result[key] === undefined) {
                chrome.storage.local.get([key], function(localResult) {
                    if (chrome.runtime.lastError || !(key in localResult) || localResult[key] === undefined) {
                        resolve(defaultValue);
                    } else {
                        resolve(localResult[key]);
                    }
                });
            } else {
                resolve(result[key]);
            }
        });
    });
}

/**
 * Writes value to chrome.storage.sync, on error falls back to chrome.storage.local.
 * @param {string} key
 * @param {*} value
 * @returns {Promise<void>}
 */
function setSyncedValue(key, value) {
    return new Promise(function(resolve) {
        if (!isExtensionContextValid()) {
            resolve();
            return;
        }

        var data = {};
        data[key] = value;
        chrome.storage.sync.set(data, function() {
            if (chrome.runtime.lastError) {
                chrome.storage.local.set(data, function() {
                    if (chrome.runtime.lastError) {
                        console.warn('[MiniMenu] Failed to save to sync and local for key:', key);
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    });
}