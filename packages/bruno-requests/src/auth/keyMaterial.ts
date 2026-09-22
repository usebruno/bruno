import fs from 'node:fs';

// Filesystem-backed key cache: avoids re-reading the same key file on every request.
// Keyed by absolute path; invalidated when the file's mtime changes.
// Capped at 50 entries to prevent unbounded growth in long-running processes.
const KEY_FILE_CACHE_MAX = 50;
const keyFileCache = new Map<string, { mtimeMs: number; content: string }>();

export function readKeyFile(filePath: string): string {
  const stat = fs.statSync(filePath);
  const cached = keyFileCache.get(filePath);
  if (cached && cached.mtimeMs === stat.mtimeMs) {
    return cached.content;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  if (keyFileCache.size >= KEY_FILE_CACHE_MAX) {
    // Evict the oldest entry (first inserted)
    const oldestKey = keyFileCache.keys().next().value;
    if (oldestKey !== undefined) {
      keyFileCache.delete(oldestKey);
    }
  }
  keyFileCache.set(filePath, { mtimeMs: stat.mtimeMs, content });
  return content;
}
