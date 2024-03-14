// See https://github.com/usebruno/bruno/pull/349 for more info
// Strict regex for validating directories. Covers most edge cases like windows device names
export const dirnameRegex = /^(?!CON|PRN|AUX|NUL|COM\d|LPT\d|^ |^-)[^<>:"/\\|?*\x00-\x1F]+[^\. ]$/;
// Not so strict Regex for filenames, because files normally get a extension e.g. ".bru" and are not affect by
// windows special names e.g. CON, PRN
export const filenameRegex = /[<>:"/\\|?*\x00-\x1F]/;

export const variableNameRegex = /^[\w-.]*$/;
