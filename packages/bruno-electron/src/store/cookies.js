const _ = require('lodash');
const Store = require('electron-store');
const { encryptString, decryptString, isEncrypted } = require('../utils/encryption');
const moment = require('moment');

const defaultCookies = {
  version: 'tough-cookie@4.0.0',
  storeType: 'MemoryCookieStore',
  idx: {}
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
    } catch (err) {
      Store.clear({
        name: 'cookies'
      });
      this.store = new Store({
        name: 'cookies',
        defaults: {
          cookies: defaultCookies
        }
      });
      this.cache = _.cloneDeep(defaultCookies);
    }
  }

  encryptCookieValue(cookie) {
    if (!cookie) return cookie;
    
    const cookieCopy = _.cloneDeep(cookie);
    
    if (cookieCopy.value && typeof cookieCopy.value === 'string' && !isEncrypted(cookieCopy.value)) {
      cookieCopy.value = encryptString(cookieCopy.value);
    }
    
    return cookieCopy;
  }
  
  decryptCookieValue(cookie) {
    if (!cookie) return cookie;
    
    const cookieCopy = _.cloneDeep(cookie);
    
    if (cookieCopy.value && typeof cookieCopy.value === 'string' && isEncrypted(cookieCopy.value)) {
      try {
        cookieCopy.value = decryptString(cookieCopy.value);
      } catch (err) {
        return null;
      }
    }
    
    return cookieCopy;
  }
  
  processCookiesRecursively(obj, processor, failedCookiesOut = null) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const result = {};
    
    for (const domain in obj) {
      result[domain] = {};
      
      for (const path in obj[domain]) {
        result[domain][path] = {};
        
        for (const key in obj[domain][path]) {
          const processedCookie = processor(obj[domain][path][key]);
          if (processedCookie !== null) {
            result[domain][path][key] = processedCookie;
          } else if (failedCookiesOut !== null) {
            failedCookiesOut.push({ domain, path, key });
          }
        }
        
        if (Object.keys(result[domain][path]).length === 0) {
          delete result[domain][path];
        }
      }
      
      if (Object.keys(result[domain]).length === 0) {
        delete result[domain];
      }
    }
    
    return result;
  }

  loadCache() {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;

    try {
      const diskCache = this.store.get('cookies');
      if (!diskCache || !diskCache?.idx) {
        this.cache = _.cloneDeep(defaultCookies);
        this.syncToDisk();
      } else if (diskCache.idx) {
        this.cache = _.cloneDeep(defaultCookies);
        
        const failedCookies = [];
        const expiredCookies = [];
        const now = moment();

        this.cache.idx = this.processCookiesRecursively(
          diskCache.idx, 
          (cookie) => {
            const isInvalidExpiry = !cookie?.expires || cookie.expires === 'null' || cookie.expires === null || cookie.expires === 'Infinity' || cookie.expires === Infinity || !moment(cookie.expires).isValid();

            if (isInvalidExpiry) {  
              return null;
            } else {
              const expiryMoment = moment(cookie.expires);
              if (expiryMoment.isBefore(now)) {
                expiredCookies.push({ 
                  domain: cookie.domain, 
                  path: cookie.path, 
                  key: cookie.key 
                });
                return null;
              }
            } 
            
            const decryptedCookie = this.decryptCookieValue(cookie);
            
            if (decryptedCookie === null) {
              failedCookies.push({ 
                domain: cookie.domain, 
                path: cookie.path, 
                key: cookie.key 
              });
              return null;
            }
            
            return decryptedCookie;
          }
        );
        
        const cookiesToRemove = [...failedCookies, ...expiredCookies];
        
        if (cookiesToRemove.length > 0) {
          const storeCache = this.store.get('cookies');
          
          cookiesToRemove.forEach(({ domain, path, key }) => {
            if (storeCache.idx[domain] && 
                storeCache.idx[domain][path] && 
                storeCache.idx[domain][path][key]) {
              
              delete storeCache.idx[domain][path][key];
              
              if (Object.keys(storeCache.idx[domain][path]).length === 0) {
                delete storeCache.idx[domain][path];
              }
              
              if (Object.keys(storeCache.idx[domain]).length === 0) {
                delete storeCache.idx[domain];
              }
            }
          });
          
          this.store.set('cookies', storeCache);
        }
      }
    } catch (err) {
      this.cache = _.cloneDeep(defaultCookies);
      this.syncToDisk();
    } finally {
      this.isLoading = false;
    }
  }

  syncToDisk() {
    if (this.writeDebounceTimeout) {
      clearTimeout(this.writeDebounceTimeout);
      this.writeDebounceTimeout = null;
    }
    
    const encryptedCache = _.cloneDeep(this.cache);
    
    if (encryptedCache && encryptedCache.idx) {
      const filteredIdx = {};
      const now = moment();
      
      Object.keys(encryptedCache.idx).forEach(domain => {
        filteredIdx[domain] = {};
        
        Object.keys(encryptedCache.idx[domain]).forEach(path => {
          filteredIdx[domain][path] = {};
          
          Object.keys(encryptedCache.idx[domain][path]).forEach(key => {
            const cookie = encryptedCache.idx[domain][path][key];            

            if (!cookie.expires || cookie.expires === 'null' || cookie.expires === null) {
              return;
            }
            
            if (cookie.expires === 'Infinity' || cookie.expires === Infinity) {
              return;
            }

            if (!moment(cookie.expires).isValid()) {
              return;
            }
            
            const expiryMoment = moment(cookie.expires);
            if (expiryMoment.isBefore(now)) {
              return;
            }
        
            filteredIdx[domain][path][key] = cookie;
          });
          
          if (Object.keys(filteredIdx[domain][path]).length === 0) {
            delete filteredIdx[domain][path];
          }
        });
      
        if (Object.keys(filteredIdx[domain]).length === 0) {
          delete filteredIdx[domain];
        }
      });
      
      encryptedCache.idx = filteredIdx;
  
      encryptedCache.idx = this.processCookiesRecursively(
        encryptedCache.idx, 
        this.encryptCookieValue.bind(this)
      );
    }
    
    this.store.set('cookies', encryptedCache);
    this.isDirty = false;
  }

  scheduleDiskWrite() {
    this.isDirty = true;
    
    if (this.writeDebounceTimeout) {
      clearTimeout(this.writeDebounceTimeout);
    }
    
    this.writeDebounceTimeout = setTimeout(() => {
      this.syncToDisk();
      this.writeDebounceTimeout = null;
    }, this.writeDebounceTime);
  }

  getCookieIdx() {
    if (!this.cache) {
      this.loadCache();
    }
    return this.cache.idx || {};
  }

  setCookies(cookies) {
    if (Array.isArray(cookies)) {
      const idx = {};
      
      cookies.forEach(cookie => {
        if (!cookie.domain || !cookie.path || !cookie.key) {
          return;
        }
        
        if (!idx[cookie.domain]) {
          idx[cookie.domain] = {};
        }
        
        if (!idx[cookie.domain][cookie.path]) {
          idx[cookie.domain][cookie.path] = {};
        }
        
        idx[cookie.domain][cookie.path][cookie.key] = cookie;
      });
      
      this.cache = {
        version: 'tough-cookie@4.0.0',
        storeType: 'MemoryCookieStore',
        idx: idx
      };
    } else if (cookies && typeof cookies === 'object') {
      this.cache = cookies;
    } else {
      return;
    }
    
    this.scheduleDiskWrite();
  }

  setCookie(cookie) {
    if (!cookie || !cookie.domain || !cookie.path || !cookie.key) {
      return;
    }

    const idx = this.getCookieIdx();

    if (!idx[cookie.domain]) {
      idx[cookie.domain] = {};
    }

    if (!idx[cookie.domain][cookie.path]) {
      idx[cookie.domain][cookie.path] = {};
    }

    idx[cookie.domain][cookie.path][cookie.key] = cookie;
    
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
      
      if (Object.keys(idx[domain][path]).length === 0) {
        delete idx[domain][path];
      }
      
      if (Object.keys(idx[domain]).length === 0) {
        delete idx[domain];
      }
      
      this.cache.idx = idx;
      this.scheduleDiskWrite();
      return true;
    }
    return false;
  }

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
        
        if (Object.keys(idx[domain]).length === 0) {
          delete idx[domain];
        }
      } else {
        delete idx[domain];
        changed = true;
      }
      
      if (changed) {
        this.cache.idx = idx;
        this.scheduleDiskWrite();
      }
      return changed;
    }
    return false;
  }
  
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
    
    Object.keys(idx).forEach(domain => {
      Object.keys(idx[domain]).forEach(path => {
        Object.keys(idx[domain][path]).forEach(key => {
          cookies.push(idx[domain][path][key]);
        });
      });
    });
    
    return cookies;
  }

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

  isDiskSynced() {
    return !this.isDirty;
  }

  close() {
    if (this.isDirty) {
      this.syncToDisk();
    }
  }
}

module.exports = CookiesElectronStore;