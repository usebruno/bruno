const HookManager = require('@usebruno/js').HookManager;
const crypto = require('crypto');

/**
 * HookManagerStore maintains HookManager instances per collection.
 * This ensures that hooks registered at collection and folder levels
 * persist across individual request executions.
 */
class HookManagerStore {
  constructor() {
    // Map of collectionUid -> HookManager instance
    this.hookManagers = new Map();

    // Map of collectionUid -> Set of registered hook levels
    // Used to track which levels have been registered to avoid re-registration
    this.registeredLevels = new Map();

    // Map of collectionUid -> Map of level -> content hash
    // Used to detect when hook scripts have changed
    this.contentHashes = new Map();

    // Map of collectionUid -> Map of level -> array of registered patterns
    // Used to track which patterns were registered at each level for cleanup
    this.levelPatterns = new Map();
  }

  /**
   * Get or create a HookManager for a collection
   * @param {string} collectionUid - Collection UID
   * @returns {HookManager} HookManager instance
   */
  getHookManager(collectionUid) {
    if (!this.hookManagers.has(collectionUid)) {
      this.hookManagers.set(collectionUid, new HookManager());
      this.registeredLevels.set(collectionUid, new Set());
    }
    return this.hookManagers.get(collectionUid);
  }

  /**
   * Check if a hook level has been registered for a collection
   * @param {string} collectionUid - Collection UID
   * @param {string} level - Hook level ('collection', 'folder:<folderUid>', 'request:<requestUid>')
   * @returns {boolean} True if already registered
   */
  isLevelRegistered(collectionUid, level) {
    const levels = this.registeredLevels.get(collectionUid);
    return levels ? levels.has(level) : false;
  }

  /**
   * Mark a hook level as registered
   * @param {string} collectionUid - Collection UID
   * @param {string} level - Hook level
   * @param {string} contentHash - Hash of the hook script content
   * @param {string[]} patterns - Array of patterns registered at this level
   */
  markLevelRegistered(collectionUid, level, contentHash, patterns = []) {
    if (!this.registeredLevels.has(collectionUid)) {
      this.registeredLevels.set(collectionUid, new Set());
    }
    this.registeredLevels.get(collectionUid).add(level);

    // Store content hash
    if (!this.contentHashes.has(collectionUid)) {
      this.contentHashes.set(collectionUid, new Map());
    }
    this.contentHashes.get(collectionUid).set(level, contentHash);

    // Store patterns for this level
    if (!this.levelPatterns.has(collectionUid)) {
      this.levelPatterns.set(collectionUid, new Map());
    }
    this.levelPatterns.get(collectionUid).set(level, patterns);
  }

  /**
   * Check if hook content has changed for a level
   * @param {string} collectionUid - Collection UID
   * @param {string} level - Hook level
   * @param {string} newContent - New hook script content
   * @returns {boolean} True if content has changed
   */
  hasContentChanged(collectionUid, level, newContent) {
    if (!this.contentHashes.has(collectionUid)) {
      return true; // Not registered yet, consider it changed
    }

    const levelHashes = this.contentHashes.get(collectionUid);
    const oldHash = levelHashes.get(level);
    const newHash = this._hashContent(newContent);

    return oldHash !== newHash;
  }

  /**
   * Clear handlers for a specific level
   * @param {string} collectionUid - Collection UID
   * @param {string} level - Hook level to clear
   */
  clearLevel(collectionUid, level) {
    const hookManager = this.hookManagers.get(collectionUid);
    if (!hookManager) {
      return;
    }

    // Get patterns registered at this level
    const levelPatterns = this.levelPatterns.get(collectionUid);
    if (levelPatterns && levelPatterns.has(level)) {
      const patterns = levelPatterns.get(level);
      // Clear handlers for all patterns registered at this level
      for (const pattern of patterns) {
        hookManager.clear(pattern);
      }
      levelPatterns.delete(level);
    }

    // Remove from registered levels
    const registeredLevels = this.registeredLevels.get(collectionUid);
    if (registeredLevels) {
      registeredLevels.delete(level);
    }

    // Remove content hash
    const contentHashes = this.contentHashes.get(collectionUid);
    if (contentHashes) {
      contentHashes.delete(level);
    }
  }

  /**
   * Hash content for change detection
   * @param {string} content - Content to hash
   * @returns {string} SHA256 hash of the content
   */
  _hashContent(content) {
    if (!content || !content.trim()) {
      return '';
    }
    return crypto.createHash('sha256').update(content.trim()).digest('hex');
  }

  /**
   * Remove a HookManager for a collection (e.g., when collection is closed)
   * @param {string} collectionUid - Collection UID
   */
  removeHookManager(collectionUid) {
    this.hookManagers.delete(collectionUid);
    this.registeredLevels.delete(collectionUid);
    this.contentHashes.delete(collectionUid);
    this.levelPatterns.delete(collectionUid);
  }

  /**
   * Clear all HookManagers (useful for testing or cleanup)
   */
  clear() {
    this.hookManagers.clear();
    this.registeredLevels.clear();
    this.contentHashes.clear();
    this.levelPatterns.clear();
  }
}

// Singleton instance
const hookManagerStore = new HookManagerStore();

module.exports = hookManagerStore;
