/**
 * Holiday detection utility
 * Determines if the current date falls within a holiday period
 */

/**
 * Check if current date is within Christmas period
 * Christmas period: December 1 - January 6 (Epiphany)
 */
function isChristmasPeriod() {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();

  // December 1 - December 31
  if (month === 12) {
    return true;
  }

  // January 1 - January 6 (Epiphany)
  if (month === 1 && day <= 6) {
    return true;
  }

  return false;
}

/**
 * Get the current holiday theme
 * @returns {string|null} The holiday theme name or null if no holiday
 */
function getCurrentHoliday() {
  if (isChristmasPeriod()) {
    return 'xmas'; // Matches file naming convention: icon-xmas.icns
  }

  // Add more holidays here as needed
  // if (isEasterPeriod()) {
  //   return 'easter';
  // }

  return null;
}

/**
 * Get icon path based on holiday
 * Uses naming convention: {basename}-{holiday}.{ext}
 * @param {string} basePath - Base path to icon directory
 * @param {string} defaultIcon - Default icon filename (e.g., '256x256.png')
 * @returns {string} Path to the appropriate icon
 */
function getHolidayIconPath(basePath, defaultIcon) {
  const holiday = getCurrentHoliday();
  const fs = require('fs');
  const path = require('path');

  if (holiday) {
    // Try holiday version: {name}-{holiday}.{ext}
    // e.g., 256x256.png -> 256x256-christmas.png
    const ext = defaultIcon.split('.').pop();
    const nameWithoutExt = defaultIcon.replace(`.${ext}`, '');
    const holidayIcon = `${nameWithoutExt}-${holiday}.${ext}`;
    const holidayIconPath = path.join(basePath, holidayIcon);

    if (fs.existsSync(holidayIconPath)) {
      return holidayIconPath;
    }
  }

  // Fall back to default icon
  return path.join(basePath, defaultIcon);
}

/**
 * Get dock icon path based on holiday (for macOS)
 * Uses naming convention: {basename}-{holiday}.{ext}
 * @param {string} basePath - Base path to icons directory
 * @param {string} defaultIcon - Default icon filename (e.g., 'icon.icns')
 * @returns {string|null} Path to the appropriate dock icon, or null if not found
 */
function getHolidayDockIconPath(basePath, defaultIcon) {
  const holiday = getCurrentHoliday();
  const fs = require('fs');
  const path = require('path');

  if (holiday) {
    // Try holiday version: {name}-{holiday}.{ext}
    // e.g., icon.icns -> icon-christmas.icns
    const ext = defaultIcon.split('.').pop();
    const nameWithoutExt = defaultIcon.replace(`.${ext}`, '');
    const holidayIcon = `${nameWithoutExt}-${holiday}.${ext}`;
    const holidayIconPath = path.join(basePath, holidayIcon);

    if (fs.existsSync(holidayIconPath)) {
      return holidayIconPath;
    }
  }

  // Fall back to default icon
  const defaultPath = path.join(basePath, defaultIcon);
  return fs.existsSync(defaultPath) ? defaultPath : null;
}

module.exports = {
  isChristmasPeriod,
  getCurrentHoliday,
  getHolidayIconPath,
  getHolidayDockIconPath
};
