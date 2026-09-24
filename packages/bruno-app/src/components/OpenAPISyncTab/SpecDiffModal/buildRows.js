/**
 * Flatten Diff2Html's parsed unified-diff output into what the virtualized
 * renderer needs:
 *
 *   rows[]         — one entry per visual row in the side-by-side layout
 *                    (exactly what Virtuoso renders)
 *   changeBlocks[] — index ranges into rows[], drives Next/Prev navigation
 *
 * Row shape:
 *   { leftNum, leftText, leftKind, rightNum, rightText, rightKind }
 *   *Kind ∈ 'ctx' | 'del' | 'ins' | 'empty' | 'hunk'
 *
 * When a row has leftKind='del' AND rightKind='ins', DiffRow recognises it
 * as a matched change and renders word-level highlights.
 */

// Diff2Html's parse() leaves the leading '+' / '-' / ' ' on each line's
// content. DiffRow renders that marker in its own styled span, so we strip
// it from the displayed text.
const stripLeadingMarker = (content) => (content || '').replace(/^[+\- ]/, '');

// Row factories — keep the row object shape consistent in one place.
const hunkRow = (header) => ({
  leftKind: 'hunk',
  rightKind: 'hunk',
  leftText: header,
  rightText: header,
  leftNum: null,
  rightNum: null
});

const contextRow = (line) => ({
  leftKind: 'ctx',
  rightKind: 'ctx',
  leftText: stripLeadingMarker(line.content),
  rightText: stripLeadingMarker(line.content),
  leftNum: line.oldNumber ?? null,
  rightNum: line.newNumber ?? null
});

const pairedChangeRow = (deletion, insertion) => ({
  leftKind: 'del',
  rightKind: 'ins',
  leftText: stripLeadingMarker(deletion.content),
  rightText: stripLeadingMarker(insertion.content),
  leftNum: deletion.oldNumber ?? null,
  rightNum: insertion.newNumber ?? null
});

const soloDeletionRow = (deletion) => ({
  leftKind: 'del',
  rightKind: 'empty',
  leftText: stripLeadingMarker(deletion.content),
  rightText: '',
  leftNum: deletion.oldNumber ?? null,
  rightNum: null
});

const soloInsertionRow = (insertion) => ({
  leftKind: 'empty',
  rightKind: 'ins',
  leftText: '',
  rightText: stripLeadingMarker(insertion.content),
  leftNum: null,
  rightNum: insertion.newNumber ?? null
});

export function buildRows(parsed) {
  const rows = [];

  if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
    return { rows, changeBlocks: [] };
  }

  // Spec sync always produces a single-file diff; ignore any others.
  const hunks = parsed[0]?.blocks || [];

  // ── Pass 1: flatten each hunk's lines into visual rows ──
  for (const hunk of hunks) {
    if (hunk.header) rows.push(hunkRow(hunk.header));

    const lines = hunk.lines || [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (line.type === 'context') {
        rows.push(contextRow(line));
        i++;
        continue;
      }

      // Collect the next run of deletions, then the run of insertions that
      // immediately follows. Pair them 1:1 into side-by-side change rows;
      // any leftovers spill as solo rows.
      //
      // e.g.  del A, del B, del C, ins X, ins Y
      //       → (A ↔ X) (B ↔ Y) (C ↔ ∅)
      const deletions = [];
      while (i < lines.length && lines[i].type === 'delete') {
        deletions.push(lines[i]);
        i++;
      }
      const insertions = [];
      while (i < lines.length && lines[i].type === 'insert') {
        insertions.push(lines[i]);
        i++;
      }

      const pairCount = Math.min(deletions.length, insertions.length);
      for (let p = 0; p < pairCount; p++) {
        rows.push(pairedChangeRow(deletions[p], insertions[p]));
      }
      for (let p = pairCount; p < deletions.length; p++) {
        rows.push(soloDeletionRow(deletions[p]));
      }
      for (let p = pairCount; p < insertions.length; p++) {
        rows.push(soloInsertionRow(insertions[p]));
      }

      // Safety: skip unknown line types so the outer loop can't stall.
      if (
        i < lines.length
        && lines[i].type !== 'context'
        && lines[i].type !== 'delete'
        && lines[i].type !== 'insert'
      ) {
        i++;
      }
    }
  }

  // ── Pass 2: group consecutive changed rows into navigation blocks ──
  // Hunk headers and context rows each close the currently-active block.
  const changeBlocks = [];
  let currentBlock = null;

  rows.forEach((row, idx) => {
    const isChanged = row.leftKind === 'del' || row.rightKind === 'ins';

    if (row.leftKind === 'hunk' || !isChanged) {
      currentBlock = null;
      return;
    }

    if (currentBlock) {
      currentBlock.endIdx = idx;
    } else {
      currentBlock = { startIdx: idx, endIdx: idx };
      changeBlocks.push(currentBlock);
    }
  });

  return { rows, changeBlocks };
}

// Wrap-around modulo so Prev at block 0 jumps to the last block. JS's
// native `%` returns -1 for `-1 % 5`; the double-mod gives 4. Clamp to 0
// when there are no blocks at all.
export function wrapIndex(idx, length) {
  if (length <= 0) return 0;
  return ((idx % length) + length) % length;
}
