import { validateValueAgainstDecorators, getDecoratorChoices, hasDecoratorType } from './validators';

describe('validateValueAgainstDecorators', () => {
  it('returns valid for value in choices', () => {
    const result = validateValueAgainstDecorators('active', [{ type: 'choices', args: ['active', 'inactive', 'pending'] }]);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('returns invalid for value not in choices', () => {
    const result = validateValueAgainstDecorators('unknown', [{ type: 'choices', args: ['active', 'inactive'] }]);
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('unknown');
    expect(result.errors[0]).toContain('active, inactive');
  });

  it('handles empty value (valid)', () => {
    const result = validateValueAgainstDecorators('', [{ type: 'choices', args: ['a', 'b'] }]);
    expect(result.isValid).toBe(true);
  });

  it('handles null/undefined decorators', () => {
    expect(validateValueAgainstDecorators('any', null).isValid).toBe(true);
    expect(validateValueAgainstDecorators('any', undefined).isValid).toBe(true);
    expect(validateValueAgainstDecorators('any', []).isValid).toBe(true);
  });

  it('handles numeric choices', () => {
    const decorators = [{ type: 'choices', args: [10, 25, 50] }];
    expect(validateValueAgainstDecorators('10', decorators).isValid).toBe(true);
    expect(validateValueAgainstDecorators('25', decorators).isValid).toBe(true);
    expect(validateValueAgainstDecorators('99', decorators).isValid).toBe(false);
  });

  it('ignores non-choices decorators', () => {
    const result = validateValueAgainstDecorators('anything', [{ type: 'required', args: [] }]);
    expect(result.isValid).toBe(true);
  });

  it('validates against multiple decorators', () => {
    const decorators = [
      { type: 'choices', args: ['a', 'b'] },
      { type: 'required', args: [] }
    ];
    expect(validateValueAgainstDecorators('a', decorators).isValid).toBe(true);
    expect(validateValueAgainstDecorators('c', decorators).isValid).toBe(false);
  });
});

describe('getDecoratorChoices', () => {
  it('returns choices from choices decorator', () => {
    const result = getDecoratorChoices([{ type: 'choices', args: ['a', 'b', 'c'] }]);
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('returns null when no choices decorator', () => {
    const result = getDecoratorChoices([{ type: 'required', args: [] }]);
    expect(result).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(getDecoratorChoices([])).toBeNull();
  });

  it('returns null for null/undefined', () => {
    expect(getDecoratorChoices(null)).toBeNull();
    expect(getDecoratorChoices(undefined)).toBeNull();
  });

  it('converts numeric choices to strings', () => {
    const result = getDecoratorChoices([{ type: 'choices', args: [10, 25, 50] }]);
    expect(result).toEqual(['10', '25', '50']);
  });

  it('finds choices in multiple decorators', () => {
    const decorators = [{ type: 'required', args: [] }, { type: 'choices', args: ['x', 'y'] }];
    const result = getDecoratorChoices(decorators);
    expect(result).toEqual(['x', 'y']);
  });

  it('returns null for choices decorator with empty args', () => {
    const result = getDecoratorChoices([{ type: 'choices', args: [] }]);
    expect(result).toBeNull();
  });
});

describe('hasDecoratorType', () => {
  it('returns true when decorator type exists', () => {
    expect(hasDecoratorType([{ type: 'choices', args: ['a'] }], 'choices')).toBe(true);
    expect(hasDecoratorType([{ type: 'required', args: [] }], 'required')).toBe(true);
  });

  it('returns false when decorator type does not exist', () => {
    expect(hasDecoratorType([{ type: 'choices', args: ['a'] }], 'required')).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(hasDecoratorType([], 'choices')).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(hasDecoratorType(null, 'choices')).toBe(false);
    expect(hasDecoratorType(undefined, 'choices')).toBe(false);
  });

  it('finds type in multiple decorators', () => {
    const decorators = [{ type: 'choices', args: [] }, { type: 'required', args: [] }];
    expect(hasDecoratorType(decorators, 'choices')).toBe(true);
    expect(hasDecoratorType(decorators, 'required')).toBe(true);
    expect(hasDecoratorType(decorators, 'other')).toBe(false);
  });
});
