// Regex for validating filenames that covers most cases
// See https://github.com/usebruno/bruno/pull/349 for more info
export const filenameRegex = /^(?!CON|PRN|AUX|NUL|COM\d|LPT\d|^ |^\-)[\w\-\. \(\)\[\]]+[^\. ]$/
