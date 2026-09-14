import {
  changeIntroducesLongLine,
  hasLongLine,
  LONG_LINE_LIMIT
} from './long-lines';

describe('hasLongLine', () => {
  it('detects a logical line longer than the limit', () => {
    expect(hasLongLine(`short\n${'x'.repeat(LONG_LINE_LIMIT + 1)}`)).toBe(true);
  });

  it('allows lines at the limit', () => {
    expect(hasLongLine('x'.repeat(LONG_LINE_LIMIT))).toBe(false);
  });

  it('counts UTF-16 columns consistently with CodeMirror', () => {
    expect(hasLongLine('😀'.repeat(LONG_LINE_LIMIT / 2 + 1))).toBe(true);
  });

  it('handles Windows and legacy Mac line endings', () => {
    expect(hasLongLine(`${'x'.repeat(LONG_LINE_LIMIT)}\r\nshort`)).toBe(false);
    expect(hasLongLine(`short\r${'x'.repeat(LONG_LINE_LIMIT + 1)}`)).toBe(true);
  });
});

describe('changeIntroducesLongLine', () => {
  it('detects a paste that joins with existing text to exceed the limit', () => {
    const line = 'x'.repeat(LONG_LINE_LIMIT - 5);
    const change = {
      from: { line: 0, ch: line.length },
      to: { line: 0, ch: line.length },
      text: ['123456']
    };

    expect(changeIntroducesLongLine(change, () => line)).toBe(true);
  });

  it('allows a multiline paste whose individual lines stay within the limit', () => {
    const change = {
      from: { line: 0, ch: 5 },
      to: { line: 0, ch: 5 },
      text: ['first', 'second']
    };

    expect(changeIntroducesLongLine(change, () => 'short line')).toBe(false);
  });

  it('allows edits inside a line already over the limit', () => {
    const line = 'x'.repeat(LONG_LINE_LIMIT + 5);
    const change = {
      from: { line: 0, ch: 3 },
      to: { line: 0, ch: 3 },
      text: ['y']
    };

    expect(changeIntroducesLongLine(change, () => line)).toBe(false);
  });
});
