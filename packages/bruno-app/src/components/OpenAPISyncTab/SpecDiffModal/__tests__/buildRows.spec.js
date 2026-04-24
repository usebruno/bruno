import { buildRows, wrapIndex } from '../buildRows';

// Helpers to construct fixture "parsed" data in the shape Diff2Html.parse()
// actually returns. Line types come from the LineType enum
// ('context' | 'insert' | 'delete'), NOT the CSSLineClass enum
// ('d2h-cntx' | 'd2h-ins' | 'd2h-del'). Verified at
// packages/bruno-app/public/static/diff2Html.js:3172.
const ctx = (text, oldNum, newNum) => ({
  type: 'context',
  content: ` ${text}`,
  oldNumber: oldNum,
  newNumber: newNum
});
const del = (text, oldNum) => ({ type: 'delete', content: `-${text}`, oldNumber: oldNum });
const ins = (text, newNum) => ({ type: 'insert', content: `+${text}`, newNumber: newNum });
const block = (header, lines) => ({ header, lines });
const file = (...blocks) => [{ blocks }];

describe('buildRows', () => {
  test('1. empty/missing input → empty rows and changeBlocks', () => {
    expect(buildRows(null)).toEqual({ rows: [], changeBlocks: [] });
    expect(buildRows(undefined)).toEqual({ rows: [], changeBlocks: [] });
    expect(buildRows([])).toEqual({ rows: [], changeBlocks: [] });
    expect(buildRows([{ blocks: [] }])).toEqual({ rows: [], changeBlocks: [] });
  });

  test('2. all-context hunk → 0 change blocks, only ctx + hunk rows', () => {
    const parsed = file(block('@@ -1,3 +1,3 @@', [ctx('a', 1, 1), ctx('b', 2, 2), ctx('c', 3, 3)]));
    const { rows, changeBlocks } = buildRows(parsed);
    expect(changeBlocks).toEqual([]);
    expect(rows).toHaveLength(4); // 1 hunk + 3 ctx
    expect(rows[0].leftKind).toBe('hunk');
    expect(rows[1].leftKind).toBe('ctx');
    expect(rows[1].leftText).toBe('a');
    expect(rows[1].rightText).toBe('a');
    expect(rows[1].leftNum).toBe(1);
    expect(rows[1].rightNum).toBe(1);
  });

  test('3. pure-deletion run → del rows with empty placeholders on right', () => {
    const parsed = file(
      block('@@ -1,3 +1,1 @@', [ctx('keep', 1, 1), del('gone1', 2), del('gone2', 3)])
    );
    const { rows, changeBlocks } = buildRows(parsed);
    expect(rows).toHaveLength(4); // 1 hunk + 1 ctx + 2 del rows
    expect(rows[2].leftKind).toBe('del');
    expect(rows[2].rightKind).toBe('empty');
    expect(rows[2].leftText).toBe('gone1');
    expect(rows[2].rightText).toBe('');
    expect(rows[2].leftNum).toBe(2);
    expect(rows[2].rightNum).toBeNull();
    expect(rows[3].leftKind).toBe('del');
    expect(rows[3].leftText).toBe('gone2');
    // Two consecutive deletions form one block
    expect(changeBlocks).toEqual([{ startIdx: 2, endIdx: 3 }]);
  });

  test('4. pure-insertion run → empty placeholders on left, ins on right', () => {
    const parsed = file(
      block('@@ -1,1 +1,3 @@', [ctx('keep', 1, 1), ins('new1', 2), ins('new2', 3)])
    );
    const { rows, changeBlocks } = buildRows(parsed);
    expect(rows).toHaveLength(4);
    expect(rows[2].leftKind).toBe('empty');
    expect(rows[2].rightKind).toBe('ins');
    expect(rows[2].leftText).toBe('');
    expect(rows[2].rightText).toBe('new1');
    expect(rows[2].leftNum).toBeNull();
    expect(rows[2].rightNum).toBe(2);
    expect(changeBlocks).toEqual([{ startIdx: 2, endIdx: 3 }]);
  });

  test('matched del+ins pair → paired row with leftKind=del, rightKind=ins', () => {
    const parsed = file(block('@@ -1,1 +1,1 @@', [del('old', 1), ins('new', 1)]));
    const { rows, changeBlocks } = buildRows(parsed);
    expect(rows).toHaveLength(2); // hunk + 1 paired change row
    // Paired row wears natural del/ins kinds — DiffRow detects this combo
    // to run word-level diff. Matches GitHub's side-by-side convention
    // (red left = deleted content, green right = inserted content).
    expect(rows[1].leftKind).toBe('del');
    expect(rows[1].rightKind).toBe('ins');
    expect(rows[1].leftText).toBe('old');
    expect(rows[1].rightText).toBe('new');
    expect(rows[1].leftNum).toBe(1);
    expect(rows[1].rightNum).toBe(1);
    expect(changeBlocks).toEqual([{ startIdx: 1, endIdx: 1 }]);
  });

  test('5. multi-hunk diff → hunk rows insert correctly + blocks segment per change region', () => {
    const parsed = file(
      block('@@ -1,2 +1,2 @@', [ctx('a', 1, 1), del('b', 2), ins('B', 2)]),
      block('@@ -10,2 +10,2 @@', [ctx('x', 10, 10), del('y', 11), ins('Y', 11)])
    );
    const { rows, changeBlocks } = buildRows(parsed);
    // Block 1: hunk + ctx + 1 paired change   = 3 rows
    // Block 2: hunk + ctx + 1 paired change   = 3 rows
    expect(rows).toHaveLength(6);
    expect(rows[0].leftKind).toBe('hunk');
    expect(rows[3].leftKind).toBe('hunk');
    // Two distinct change blocks (separated by hunk header reset)
    expect(changeBlocks).toEqual([
      { startIdx: 2, endIdx: 2 },
      { startIdx: 5, endIdx: 5 }
    ]);
  });

  test('6. REGRESSION: change-block count matches expected counts for 3 fixture shapes', () => {
    // The old DOM walker counted contiguous DOM rows containing
    // .d2h-ins/.d2h-del/.d2h-change as one block. The new row-list walker
    // must produce the same count for the same diff shape.

    // Fixture A: small diff, one contiguous change region
    const fixtureA = file(
      block('@@ -1,4 +1,4 @@', [ctx('a', 1, 1), del('b', 2), ins('B', 2), ctx('c', 3, 3)])
    );
    expect(buildRows(fixtureA).changeBlocks).toHaveLength(1);

    // Fixture B: medium, two separate change regions in one hunk
    const fixtureB = file(
      block('@@ -1,7 +1,7 @@', [
        ctx('a', 1, 1),
        del('b', 2),
        ins('B', 2),
        ctx('c', 3, 3),
        ctx('d', 4, 4),
        del('e', 5),
        ins('E', 5),
        ctx('f', 6, 6)
      ])
    );
    expect(buildRows(fixtureB).changeBlocks).toHaveLength(2);

    // Fixture C: multi-hunk with adjacent del+ins runs that form a single
    // contiguous change region per hunk
    const fixtureC = file(
      block('@@ -1,3 +1,4 @@', [ctx('a', 1, 1), del('b', 2), ins('B', 2), ins('C', 3)]),
      block('@@ -10,4 +11,4 @@', [
        ctx('x', 10, 11),
        del('y', 11),
        del('z', 12),
        ins('Y', 12),
        ins('Z', 13)
      ])
    );
    expect(buildRows(fixtureC).changeBlocks).toHaveLength(2);
  });
});

describe('wrapIndex', () => {
  test('7. wrap-around modulo handles negative and overflow', () => {
    expect(wrapIndex(0, 5)).toBe(0);
    expect(wrapIndex(4, 5)).toBe(4);
    expect(wrapIndex(5, 5)).toBe(0);
    expect(wrapIndex(6, 5)).toBe(1);
    expect(wrapIndex(-1, 5)).toBe(4);
    expect(wrapIndex(-6, 5)).toBe(4);
    expect(wrapIndex(0, 0)).toBe(0);
    expect(wrapIndex(3, 0)).toBe(0);
  });
});
