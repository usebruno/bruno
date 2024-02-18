// See https://github.com/usebruno/bruno/pull/349 for more info
// Scrict regex for validating directories. Covers most edge cases like windows device names
export const dirnameRegex = /^(?!CON|PRN|AUX|NUL|COM\d|LPT\d|^ |^\-)[^<>:"/\\|?*\x00-\x1F]+[^\. ]$/;

export const variableNameRegex = /^[\w-.]*$/;
