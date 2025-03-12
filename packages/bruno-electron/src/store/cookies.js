const _ = require('lodash');
const Store = require('electron-store');
const { encryptString, decryptString, isEncrypted } = require('../utils/encryption');

const defaultCookies = {
  version: 'tough-cookie@4.0.0',
  storeType: 'MemoryCookieStore',
  idx: {} // Use nested object instead of array
};

class CookiesElectronStore {
  constructor() {
    this.cache = null;
    this.isDirty = false;
    this.writeDebounceTimeout = null;
    this.isLoading = false;
    this.writeDebounceTime = 5000; // ms to wait before writing to disk

    try {
      this.store = new Store({
        name: 'cookies',
        clearInvalidConfig: true,
        defaults: {
          cookies: defaultCookies
        }
      });
      // No initial cache loading - will load on first use
    } catch (err) {
      // If store creation fails due to corrupt file, create a new store with defaults
      console.error('Error creating cookie store:', err);
      // Delete the corrupted file
      Store.clear({
        name: 'cookies'
      });
      // Recreate store with defaults
      this.store = new Store({
        name: 'cookies',
        defaults: {
          cookies: defaultCookies
        }
      });
      // Initialize cache with defaults
      this.cache = _.cloneDeep(defaultCookies);
    }
  }

  // Encrypt a cookie's value before saving to disk
  encryptCookieValue(cookie) {
    if (!cookie) return cookie;
    
    const cookieCopy = _.cloneDeep(cookie);
    
    // Only encrypt if the value is not already encrypted
    if (cookieCopy.value && typeof cookieCopy.value === 'string' && !isEncrypted(cookieCopy.value)) {
      cookieCopy.value = encryptString(cookieCopy.value);
    }
    
    return cookieCopy;
  }
  
  // Decrypt a cookie's value after loading from disk
  decryptCookieValue(cookie) {
    if (!cookie) return cookie;
    
    const cookieCopy = _.cloneDeep(cookie);
    
    // Only decrypt if the value is encrypted
    if (cookieCopy.value && typeof cookieCopy.value === 'string' && isEncrypted(cookieCopy.value)) {
      try {
        cookieCopy.value = decryptString(cookieCopy.value);
      } catch (err) {
        console.error('Error decrypting cookie value:', err);
        // Keep the encrypted value if decryption fails
      }
    }
    
    return cookieCopy;
  }
  
  // Recursively process cookie structure to encrypt/decrypt all values
  processCookiesRecursively(obj, processor) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const result = {};
    
    for (const domain in obj) {
      result[domain] = {};
      
      for (const path in obj[domain]) {
        result[domain][path] = {};
        
        for (const key in obj[domain][path]) {
          result[domain][path][key] = processor(obj[domain][path][key]);
        }
      }
    }
    
    return result;
  }

  // Load data from disk into cache
  loadCache() {
    // Prevent multiple concurrent loads
    if (this.isLoading) {
      console.log('Cache load already in progress, skipping');
      return;
    }

    console.log('Loading cache...');
    this.isLoading = true;

    try {
      const diskCache = this.store.get('cookies');
      console.log('Cache loaded:');
      console.log(diskCache);
      if (!diskCache || !diskCache?.idx) {
        this.cache = _.cloneDeep(defaultCookies);
        this.syncToDisk();
      } else if (diskCache.idx) {
        // Initialize cache with default structure first
        this.cache = _.cloneDeep(defaultCookies);
        // Decrypt all cookie values from disk
        this.cache.idx = this.processCookiesRecursively(diskCache.idx, this.decryptCookieValue.bind(this));
      }
    } catch (err) {
      console.error('Error loading cookies cache:', err);
      this.cache = _.cloneDeep(defaultCookies);
      this.syncToDisk();
    } finally {
      this.isLoading = false;
    }
  }

  // Force immediate sync of cache to disk
  syncToDisk() {
    if (this.writeDebounceTimeout) {
      clearTimeout(this.writeDebounceTimeout);
      this.writeDebounceTimeout = null;
    }
    console.log('Syncing to disk...');
    
    // Create a deep copy of the cache to encrypt without affecting the in-memory values
    const encryptedCache = _.cloneDeep(this.cache);
    
    // Encrypt all cookie values for disk storage
    if (encryptedCache && encryptedCache.idx) {
      encryptedCache.idx = this.processCookiesRecursively(encryptedCache.idx, this.encryptCookieValue.bind(this));
    }
    
    this.store.set('cookies', encryptedCache);
    this.isDirty = false;
  }

  // Schedule a write to disk with debouncing
  scheduleDiskWrite() {
    this.isDirty = true;
    
    if (this.writeDebounceTimeout) {
      clearTimeout(this.writeDebounceTimeout);
    }
    
    console.log('Scheduling disk write...');
    
    this.writeDebounceTimeout = setTimeout(() => {
      this.syncToDisk();
      this.writeDebounceTimeout = null;
    }, this.writeDebounceTime);
  }

  // Get the current cache data
  getCookieIdx() {
    if (!this.cache) {
      // Load cache on first access
      this.loadCache();
    }
    return this.cache.idx || {};
  }

  setCookies(cookies) {
    // If the cookies parameter is an array, convert it to our idx structure
    if (Array.isArray(cookies)) {
      const idx = {};
      
      cookies.forEach(cookie => {
        if (!cookie.domain || !cookie.path || !cookie.key) {
          console.warn('Invalid cookie format, missing domain, path, or key', cookie);
          return;
        }
        
        // Create domain level if it doesn't exist
        if (!idx[cookie.domain]) {
          idx[cookie.domain] = {};
        }
        
        // Create path level if it doesn't exist
        if (!idx[cookie.domain][cookie.path]) {
          idx[cookie.domain][cookie.path] = {};
        }
        
        // Set the cookie at the key level (already decrypted in memory)
        idx[cookie.domain][cookie.path][cookie.key] = cookie;
      });
      
      // Update cache
      this.cache = {
        version: 'tough-cookie@4.0.0',
        storeType: 'MemoryCookieStore',
        idx: idx
      };
    } else if (cookies && typeof cookies === 'object') {
      // If it's already an object with the expected structure, just set it
      this.cache = cookies;
    } else {
      console.warn('Invalid cookies format provided to setCookies', cookies);
      return;
    }
    
    // Schedule write to disk
    this.scheduleDiskWrite();
  }

  setCookie(cookie) {
    if (!cookie || !cookie.domain || !cookie.path || !cookie.key) {
      console.warn('Invalid cookie format, missing domain, path, or key', cookie);
      return;
    }

    const idx = this.getCookieIdx();

    // Create domain level if it doesn't exist
    if (!idx[cookie.domain]) {
      idx[cookie.domain] = {};
    }

    // Create path level if it doesn't exist
    if (!idx[cookie.domain][cookie.path]) {
      idx[cookie.domain][cookie.path] = {};
    }

    // Set the cookie at the key level (keep decrypted in memory)
    idx[cookie.domain][cookie.path][cookie.key] = cookie;
    
    // Update cache and schedule write
    this.cache.idx = idx;
    this.scheduleDiskWrite();
  }

  deleteCookie(domain, path, key) {
    const idx = this.getCookieIdx();

    if (
      idx[domain] &&
      idx[domain][path] &&
      idx[domain][path][key]
    ) {
      delete idx[domain][path][key];
      
      // Clean up empty objects
      if (Object.keys(idx[domain][path]).length === 0) {
        delete idx[domain][path];
      }
      
      if (Object.keys(idx[domain]).length === 0) {
        delete idx[domain];
      }
      
      // Update cache and schedule write
      this.cache.idx = idx;
      this.scheduleDiskWrite();
      return true;
    }
    return false;
  }

  // Alias for deleteCookie to match tough-cookie API
  removeCookie(domain, path, key) {
    return this.deleteCookie(domain, path, key);
  }

  deleteCookies(domain, path) {
    const idx = this.getCookieIdx();
    let changed = false;

    if (idx[domain]) {
      if (path && idx[domain][path]) {
        delete idx[domain][path];
        changed = true;
        
        // Clean up if domain is now empty
        if (Object.keys(idx[domain]).length === 0) {
          delete idx[domain];
        }
      } else {
        // If no path specified, delete the entire domain
        delete idx[domain];
        changed = true;
      }
      
      if (changed) {
        // Update cache and schedule write
        this.cache.idx = idx;
        this.scheduleDiskWrite();
      }
      return changed;
    }
    return false;
  }
  
  // Remove all cookies from the store
  removeAllCookies() {
    this.cache = {
      version: 'tough-cookie@4.0.0',
      storeType: 'MemoryCookieStore',
      idx: {}
    };
    this.scheduleDiskWrite();
  }
  
  getCookies() {
    const idx = this.getCookieIdx();
    const cookies = [];
    
    // Convert nested structure back to flat array
    Object.keys(idx).forEach(domain => {
      Object.keys(idx[domain]).forEach(path => {
        Object.keys(idx[domain][path]).forEach(key => {
          cookies.push(idx[domain][path][key]);
        });
      });
    });
    
    return cookies;
  }

  // Get a specific cookie
  getCookie(domain, path, key) {
    const idx = this.getCookieIdx();
    
    if (
      idx[domain] &&
      idx[domain][path] &&
      idx[domain][path][key]
    ) {
      return idx[domain][path][key];
    }
    
    return null;
  }

  // Get all cookies for a domain and path
  getCookiesByDomainAndPath(domain, path) {
    const idx = this.getCookieIdx();
    const cookies = [];
    
    if (idx[domain] && idx[domain][path]) {
      Object.keys(idx[domain][path]).forEach(key => {
        cookies.push(idx[domain][path][key]);
      });
    }
    
    return cookies;
  }

  // For testing and debugging
  isDiskSynced() {
    return !this.isDirty;
  }

  // Force sync and close any pending operations
  // Useful before app shutdown
  close() {
    if (this.isDirty) {
      this.syncToDisk();
    }
  }
}

module.exports = CookiesElectronStore;