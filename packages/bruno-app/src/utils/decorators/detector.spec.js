import { detectAndParseDecorator } from './detector';

describe('detectAndParseDecorator', () => {
  it('detects valid @choices decorator', () => {
    const result = detectAndParseDecorator('@choices("active", "inactive", "pending")');
    expect(result.isDecorator).toBe(true);
    expect(result.decorator).toEqual({
      type: 'choices',
      args: ['active', 'inactive', 'pending']
    });
    expect(result.defaultValue).toBe('active');
    expect(result.warning).toBeNull();
  });

  it('returns first choice as default value', () => {
    const result = detectAndParseDecorator('@choices("first", "second")');
    expect(result.defaultValue).toBe('first');
  });

  it('returns empty default for choices with no args', () => {
    const result = detectAndParseDecorator('@choices()');
    expect(result.isDecorator).toBe(true);
    expect(result.defaultValue).toBe('');
  });

  it('detects decorator without arguments', () => {
    const result = detectAndParseDecorator('@required');
    expect(result.isDecorator).toBe(true);
    expect(result.decorator).toEqual({
      type: 'required',
      args: []
    });
    expect(result.defaultValue).toBe('');
  });

  it('returns regular value for non-decorator input', () => {
    const result = detectAndParseDecorator('hello world');
    expect(result.isDecorator).toBe(false);
    expect(result.decorator).toBeNull();
    expect(result.defaultValue).toBe('hello world');
    expect(result.warning).toBeNull();
  });

  it('handles empty input', () => {
    const result = detectAndParseDecorator('');
    expect(result.isDecorator).toBe(false);
    expect(result.defaultValue).toBe('');
  });

  it('handles null/undefined input', () => {
    expect(detectAndParseDecorator(null).isDecorator).toBe(false);
    expect(detectAndParseDecorator(null).defaultValue).toBe('');
    expect(detectAndParseDecorator(undefined).isDecorator).toBe(false);
    expect(detectAndParseDecorator(undefined).defaultValue).toBe('');
  });

  it('shows warning for invalid decorator syntax (unclosed paren)', () => {
    // Unclosed parenthesis doesn't match the regex pattern
    const result = detectAndParseDecorator('@choices("unclosed');
    expect(result.isDecorator).toBe(false);
    expect(result.decorator).toBeNull();
    expect(result.defaultValue).toBe('@choices("unclosed');
    expect(result.warning).toBe('Invalid decorator syntax');
  });

  it('shows warning for invalid JSON in arguments', () => {
    // Valid pattern but invalid JSON
    const result = detectAndParseDecorator('@choices(invalid)');
    expect(result.isDecorator).toBe(false);
    expect(result.decorator).toBeNull();
    expect(result.warning).toBe('Invalid decorator arguments');
  });

  it('treats @ at start but invalid syntax as value with warning', () => {
    const result = detectAndParseDecorator('@');
    expect(result.isDecorator).toBe(false);
    expect(result.warning).toBe('Invalid decorator syntax');
    expect(result.defaultValue).toBe('@');
  });

  it('handles numeric choices', () => {
    const result = detectAndParseDecorator('@choices(10, 25, 50)');
    expect(result.isDecorator).toBe(true);
    expect(result.defaultValue).toBe('10');
  });

  it('handles mixed type choices', () => {
    const result = detectAndParseDecorator('@choices("auto", 100)');
    expect(result.isDecorator).toBe(true);
    expect(result.defaultValue).toBe('auto');
  });

  it('handles whitespace around input', () => {
    const result = detectAndParseDecorator('  @choices("a")  ');
    expect(result.isDecorator).toBe(true);
    expect(result.decorator.args).toEqual(['a']);
  });

  it('does not detect @ in the middle of text', () => {
    const result = detectAndParseDecorator('email@example.com');
    expect(result.isDecorator).toBe(false);
    expect(result.defaultValue).toBe('email@example.com');
  });
});
