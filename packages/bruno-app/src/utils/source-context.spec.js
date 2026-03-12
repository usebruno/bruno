import { findLineInSource, getScriptContext } from './source-context';

describe('findLineInSource', () => {
  it('should find correct line number for matching text', () => {
    const source = 'line one\nline two\nline three';
    expect(findLineInSource(source, 'line two')).toBe(2);
  });

  it('should return 1 for match on first line', () => {
    const source = 'first line\nsecond line';
    expect(findLineInSource(source, 'first line')).toBe(1);
  });

  it('should return null for missing text', () => {
    const source = 'line one\nline two\nline three';
    expect(findLineInSource(source, 'not here')).toBeNull();
  });

  it('should return null for null source', () => {
    expect(findLineInSource(null, 'text')).toBeNull();
  });

  it('should return null for null searchText', () => {
    expect(findLineInSource('some source', null)).toBeNull();
  });

  it('should return null for empty source', () => {
    expect(findLineInSource('', 'text')).toBeNull();
  });

  it('should return null for empty searchText', () => {
    expect(findLineInSource('some source', '')).toBeNull();
  });

  it('should find first occurrence when text appears multiple times', () => {
    const source = 'line one\npm.vault.get("a")\nother\npm.vault.get("b")';
    expect(findLineInSource(source, 'pm.vault.get')).toBe(2);
  });
});

describe('getScriptContext', () => {
  const source = [
    'const a = 1;',
    'const b = 2;',
    'const c = 3;',
    'pm.vault.get("secret");',
    'const d = 4;',
    'const e = 5;',
    'const f = 6;'
  ].join('\n');

  it('should return correct context lines around the target line', () => {
    const result = getScriptContext(source, 4, 2);
    expect(result).not.toBeNull();
    expect(result.highlightedLine).toBe(4);
    expect(result.lines).toHaveLength(5);
    expect(result.lines[0].lineNumber).toBe(2);
    expect(result.lines[2].lineNumber).toBe(4);
    expect(result.lines[2].isHighlighted).toBe(true);
    expect(result.lines[2].content).toBe('pm.vault.get("secret");');
    expect(result.lines[4].lineNumber).toBe(6);
  });

  it('should handle first line correctly', () => {
    const result = getScriptContext(source, 1, 2);
    expect(result.lines[0].lineNumber).toBe(1);
    expect(result.lines[0].isHighlighted).toBe(true);
    expect(result.lines).toHaveLength(3);
  });

  it('should handle last line correctly', () => {
    const result = getScriptContext(source, 7, 2);
    expect(result.lines[result.lines.length - 1].lineNumber).toBe(7);
    expect(result.lines[result.lines.length - 1].isHighlighted).toBe(true);
  });

  it('should handle short scripts', () => {
    const shortSource = 'only line';
    const result = getScriptContext(shortSource, 1, 3);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].isHighlighted).toBe(true);
  });

  it('should return null for null source', () => {
    expect(getScriptContext(null, 1)).toBeNull();
  });

  it('should return null for invalid line number', () => {
    expect(getScriptContext(source, 0)).toBeNull();
    expect(getScriptContext(source, -1)).toBeNull();
  });

  it('should return null for line number beyond source', () => {
    expect(getScriptContext(source, 100)).toBeNull();
  });

  it('should mark only the target line as highlighted', () => {
    const result = getScriptContext(source, 4, 3);
    const highlightedLines = result.lines.filter((l) => l.isHighlighted);
    expect(highlightedLines).toHaveLength(1);
    expect(highlightedLines[0].lineNumber).toBe(4);
  });
});
