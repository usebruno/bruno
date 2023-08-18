/**
 * The preferences are stored in the browser local storage.
 * When the app is started, an IPC message is published from the renderer process to set the preferences.
 * The electron process uses this module to get the preferences.
 */

let preferences = {};

const getPreferences = () => {
  return preferences;
}

const setPreferences = (newPreferences) => {
  console.log('setting preferences');
  console.log(newPreferences);
  preferences = newPreferences;
}

module.exports = {
  getPreferences,
  setPreferences
};
