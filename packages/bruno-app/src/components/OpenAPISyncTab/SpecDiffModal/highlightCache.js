import { escapeHtml } from 'utils/response';

// Skip word-level diff on lines longer than this (Diff2Html default is 10k).
const MAX_HIGHLIGHT_LENGTH = 5000;

export function createHighlightCache() {
  // Map of `${left}\x00${right}` → { left, right } HTML. The null byte separator safely delimits the pair.
  const cache = new Map();

  return {
    // Character-level diff for a paired deletion + insertion row. Returns
    // { left, right } HTML strings with <del>/<ins> wrapping changed substrings.
    getWordDiff(leftContent, rightContent) {
      const key = `${leftContent}\x00${rightContent}`;
      const hit = cache.get(key);
      if (hit !== undefined) return hit; // cache hit → skip the ~1-3ms recomputation

      // Diff2Html ships as a global UMD bundle loaded from /public/static.
      const D2H = typeof window !== 'undefined' && window.Diff2Html;
      let result;
      if (D2H && typeof D2H.diffHighlight === 'function') {
        try {
          // diffHighlight's internal parser expects each line to start with a
          // prefix char (-, +, space) and strips it. We prepend '-' / '+' here
          // purely to satisfy that input shape.
          const out = D2H.diffHighlight(
            `-${leftContent}`,
            `+${rightContent}`,
            false, // isCombined: standard two-way diff, not a git combined diff
            { matching: 'words', maxLineLengthHighlight: MAX_HIGHLIGHT_LENGTH }
          );
          // out.oldLine/newLine.content already has the <del>/<ins> markup we want.
          result = {
            left: out?.oldLine?.content ?? escapeHtml(leftContent),
            right: out?.newLine?.content ?? escapeHtml(rightContent)
          };
        } catch {
          // Malformed input or Diff2Html internal error — fall back so the row still renders.
          result = { left: escapeHtml(leftContent), right: escapeHtml(rightContent) };
        }
      } else {
        // Diff2Html bundle hasn't loaded (test env, CSP, etc.) — escape only.
        result = { left: escapeHtml(leftContent), right: escapeHtml(rightContent) };
      }

      cache.set(key, result); // stored so Virtuoso remounts of this same row hit cache
      return result;
    },

    // Empties the cache when a fresh diff replaces the current one.
    clear() {
      cache.clear();
    }
  };
}
