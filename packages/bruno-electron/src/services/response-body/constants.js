/** Inline Show over IPC when response size is at or below this (bytes). */
const SHOW_INLINE_BYTES = 10 * 1024 * 1024;

/** View-from-disk allowed at or below this; above → Download only (bytes). */
const VIEW_MAX_BYTES = 50 * 1024 * 1024;

/** Entry always has an on-disk spill file (and an in-memory buffer from the dual writer). */
const STORAGE_FILE = 'file';

module.exports = {
  SHOW_INLINE_BYTES,
  VIEW_MAX_BYTES,
  STORAGE_FILE
};
