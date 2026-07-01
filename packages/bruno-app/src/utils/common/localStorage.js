export const SIDEBAR_WIDTH_KEY = 'bruno.leftSidebarWidth';
export const SIDEBAR_COLLAPSED_KEY = 'bruno.sidebarCollapsed';

/**
 * Read a value from localStorage with a fallback and optional parsing function.
 * @param {string} key - The localStorage key.
 * @param {*} fallback - The fallback value if key is not found.
 * @param {function} [parse] - The parse function to convert the stored string to the target type.
 * @returns {*} The read value or fallback.
 */
export const getLocalStorageValue = (key, fallback, parse) => {
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === null) {
      return fallback;
    }
    return parse ? parse(stored) : stored;
  } catch (err) {
    return fallback;
  }
};

/**
 * Write a value to localStorage.
 * @param {string} key - The localStorage key.
 * @param {*} value - The value to store.
 */
export const setLocalStorageValue = (key, value) => {
  try {
    window.localStorage.setItem(key, value);
  } catch (err) { }
};

/**
 * Check if a key exists in localStorage.
 * @param {string} key - The localStorage key.
 * @returns {boolean} True if the key exists, false otherwise.
 */
export const hasLocalStorageValue = (key) => {
  try {
    return window.localStorage.getItem(key) !== null;
  } catch (err) {
    return false;
  }
};

/**
 * Delete a key from localStorage.
 * @param {string} key - The localStorage key.
 */
export const deleteLocalStorageValue = (key) => {
  try {
    window.localStorage.removeItem(key);
  } catch (err) { }
};
