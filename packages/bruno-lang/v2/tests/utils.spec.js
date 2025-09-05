const { getValueString } = require('../src/utils');

describe('getValueString', () => {
  it('returns single line value as-is', () => {
    expect(getValueString('hello world')).toBe('hello world');
  });

  it('wraps multiline value in triple quotes with indentation', () => {
    expect(getValueString('line1\nline2\nline3')).toBe("'''\n  line1\n  line2\n  line3\n'''");
  });

  it('normalizes different newline types', () => {
    expect(getValueString('line1\r\nline2\rline3\nline4')).toBe("'''\n  line1\n  line2\n  line3\n  line4\n'''");
  });

  it('trims trailing whitespace and blank lines', () => {
    expect(getValueString('line1\nline2\nline3   \n  \n')).toBe("'''\n  line1\n  line2\n  line3\n'''");
  });

  it('returns empty string for empty/null/undefined', () => {
    expect(getValueString('')).toBe('');
    expect(getValueString(null)).toBe('');
    expect(getValueString(undefined)).toBe('');
  });
});
