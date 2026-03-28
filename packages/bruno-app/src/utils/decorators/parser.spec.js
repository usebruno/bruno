import { parseDecoratorSyntax, formatDecoratorToSyntax, formatDecoratorsToSyntax } from './parser';

describe('parseDecoratorSyntax', () => {
  it('parses @choices with string arguments', () => {
    const result = parseDecoratorSyntax('@choices("active", "inactive", "pending")');
    expect(result.decorator).toEqual({
      type: 'choices',
      args: ['active', 'inactive', 'pending']
    });
    expect(result.error).toBeNull();
  });

  it('parses @choices with numeric arguments', () => {
    const result = parseDecoratorSyntax('@choices(10, 25, 50, 100)');
    expect(result.decorator).toEqual({
      type: 'choices',
      args: [10, 25, 50, 100]
    });
    expect(result.error).toBeNull();
  });

  it('parses @choices with mixed arguments', () => {
    const result = parseDecoratorSyntax('@choices("auto", 100, 200)');
    expect(result.decorator).toEqual({
      type: 'choices',
      args: ['auto', 100, 200]
    });
    expect(result.error).toBeNull();
  });

  it('parses decorator without arguments', () => {
    const result = parseDecoratorSyntax('@required');
    expect(result.decorator).toEqual({
      type: 'required',
      args: []
    });
    expect(result.error).toBeNull();
  });

  it('returns null for regular values (not decorators)', () => {
    const result = parseDecoratorSyntax('hello world');
    expect(result.decorator).toBeNull();
    expect(result.error).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(parseDecoratorSyntax('')).toEqual({ decorator: null, error: null });
    expect(parseDecoratorSyntax(null)).toEqual({ decorator: null, error: null });
    expect(parseDecoratorSyntax(undefined)).toEqual({ decorator: null, error: null });
  });

  it('returns error for invalid decorator syntax', () => {
    const result = parseDecoratorSyntax('@');
    expect(result.decorator).toBeNull();
    expect(result.error).toBe('Invalid decorator syntax');
  });

  it('returns error for malformed arguments (unclosed paren)', () => {
    // Unclosed parenthesis doesn't match the regex pattern
    const result = parseDecoratorSyntax('@choices("unclosed');
    expect(result.decorator).toBeNull();
    expect(result.error).toBe('Invalid decorator syntax');
  });

  it('returns error for invalid JSON in arguments', () => {
    // Valid pattern but invalid JSON
    const result = parseDecoratorSyntax('@choices(invalid)');
    expect(result.decorator).toBeNull();
    expect(result.error).toBe('Invalid decorator arguments');
  });

  it('handles whitespace', () => {
    const result = parseDecoratorSyntax('  @choices("a", "b")  ');
    expect(result.decorator).toEqual({
      type: 'choices',
      args: ['a', 'b']
    });
  });

  it('parses decorator with single argument', () => {
    const result = parseDecoratorSyntax('@default("active")');
    expect(result.decorator).toEqual({
      type: 'default',
      args: ['active']
    });
  });

  it('parses decorator with boolean arguments', () => {
    const result = parseDecoratorSyntax('@flags(true, false)');
    expect(result.decorator).toEqual({
      type: 'flags',
      args: [true, false]
    });
  });
});

describe('formatDecoratorToSyntax', () => {
  it('formats decorator with string arguments', () => {
    const result = formatDecoratorToSyntax({ type: 'choices', args: ['a', 'b', 'c'] });
    expect(result).toBe('@choices("a", "b", "c")');
  });

  it('formats decorator with numeric arguments', () => {
    const result = formatDecoratorToSyntax({ type: 'choices', args: [10, 25, 50] });
    expect(result).toBe('@choices(10, 25, 50)');
  });

  it('formats decorator without arguments', () => {
    const result = formatDecoratorToSyntax({ type: 'required', args: [] });
    expect(result).toBe('@required');
  });

  it('handles null/undefined decorator', () => {
    expect(formatDecoratorToSyntax(null)).toBe('');
    expect(formatDecoratorToSyntax(undefined)).toBe('');
    expect(formatDecoratorToSyntax({})).toBe('');
  });

  it('handles mixed argument types', () => {
    const result = formatDecoratorToSyntax({ type: 'mixed', args: ['text', 42, true] });
    expect(result).toBe('@mixed("text", 42, true)');
  });
});

describe('formatDecoratorsToSyntax', () => {
  it('formats multiple decorators', () => {
    const result = formatDecoratorsToSyntax([
      { type: 'choices', args: ['a', 'b'] },
      { type: 'required', args: [] }
    ]);
    expect(result).toBe('@choices("a", "b") @required');
  });

  it('handles empty array', () => {
    expect(formatDecoratorsToSyntax([])).toBe('');
    expect(formatDecoratorsToSyntax(null)).toBe('');
    expect(formatDecoratorsToSyntax(undefined)).toBe('');
  });

  it('handles single decorator', () => {
    const result = formatDecoratorsToSyntax([{ type: 'choices', args: ['x'] }]);
    expect(result).toBe('@choices("x")');
  });
});

describe('round-trip (parse -> format)', () => {
  it('preserves @choices decorator', () => {
    const original = '@choices("active", "inactive", "pending")';
    const { decorator } = parseDecoratorSyntax(original);
    const formatted = formatDecoratorToSyntax(decorator);
    expect(formatted).toBe(original);
  });

  it('preserves decorator without arguments', () => {
    const original = '@required';
    const { decorator } = parseDecoratorSyntax(original);
    const formatted = formatDecoratorToSyntax(decorator);
    expect(formatted).toBe(original);
  });

  it('preserves numeric arguments', () => {
    const original = '@choices(10, 25, 50)';
    const { decorator } = parseDecoratorSyntax(original);
    const formatted = formatDecoratorToSyntax(decorator);
    expect(formatted).toBe(original);
  });
});
