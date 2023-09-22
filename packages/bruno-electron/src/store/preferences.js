/**
 * The preferences are stored in the browser local storage.
 * When the app is started, an IPC message is published from the renderer process to set the preferences.
 * The electron process uses this module to get the preferences.
 *
 * {
 *   request: {
 *     sslVerification: boolean
 *   }
 * }
 */

let preferences = {};

const getPreferences = () => {
  return preferences;
};

const setPreferences = (newPreferences) => {
  preferences = newPreferences;
};

module.exports = {
  getPreferences,
  setPreferences
};
