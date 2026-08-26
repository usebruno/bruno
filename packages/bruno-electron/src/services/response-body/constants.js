/** Spill from memory Map to temp file above this size (bytes). */
const SPILL_THRESHOLD_BYTES = 100 * 1024 * 1024;

const STORAGE_MEMORY = 'memory';
const STORAGE_FILE = 'file';

module.exports = {
  SPILL_THRESHOLD_BYTES,
  STORAGE_MEMORY,
  STORAGE_FILE
};
