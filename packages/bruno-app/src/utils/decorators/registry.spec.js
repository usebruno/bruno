import {
  getType,
  hasType,
  getTypeNames,
  getAllTypes,
  validateWithType,
  validateWithDecorators,
  getDefaultValueForDecorators,
  getVisualRenderer,
  formatDecoratorSyntax,
  formatDecoratorsSyntax,
  // Legacy exports
  getDecorator,
  hasDecorator,
  getDecoratorNames,
  getAllDecorators,
  validateWithDecorator
} from './registry';

describe('Type Registry', () => {
  describe('getType', () => {
    it('returns type definition for known types', () => {
      const choices = getType('choices');
      expect(choices).not.toBeNull();
      expect(choices.name).toBe('choices');
      expect(typeof choices.validate).toBe('function');
      expect(typeof choices.getDefaultValue).toBe('function');
    });

    it('returns null for unknown types', () => {
      expect(getType('unknownType')).toBeNull();
    });
  });

  describe('hasType', () => {
    it('returns true for registered types', () => {
      expect(hasType('string')).toBe(true);
      expect(hasType('number')).toBe(true);
      expect(hasType('boolean')).toBe(true);
      expect(hasType('choices')).toBe(true);
      expect(hasType('date')).toBe(true);
      expect(hasType('email')).toBe(true);
      expect(hasType('url')).toBe(true);
    });

    it('returns false for unregistered types', () => {
      expect(hasType('unknownType')).toBe(false);
    });
  });

  describe('getTypeNames', () => {
    it('returns all registered type names', () => {
      const names = getTypeNames();
      expect(names).toContain('string');
      expect(names).toContain('number');
      expect(names).toContain('boolean');
      expect(names).toContain('choices');
      expect(names).toContain('date');
      expect(names).toContain('email');
      expect(names).toContain('url');
    });
  });

  describe('validateWithType', () => {
    describe('string', () => {
      it('validates value against pattern', () => {
        expect(validateWithType('123', 'string', { pattern: '^[0-9]+$' }).isValid).toBe(true);
        expect(validateWithType('abc', 'string', { pattern: '^[0-9]+$' }).isValid).toBe(false);
      });

      it('returns valid when no pattern', () => {
        expect(validateWithType('anything', 'string', {}).isValid).toBe(true);
        expect(validateWithType('anything', 'string', null).isValid).toBe(true);
      });
    });

    describe('number', () => {
      it('validates numeric values', () => {
        expect(validateWithType('123', 'number', {}).isValid).toBe(true);
        expect(validateWithType('12.5', 'number', {}).isValid).toBe(true);
        expect(validateWithType('abc', 'number', {}).isValid).toBe(false);
      });

      it('validates min constraint', () => {
        expect(validateWithType('10', 'number', { min: '5' }).isValid).toBe(true);
        expect(validateWithType('3', 'number', { min: '5' }).isValid).toBe(false);
      });

      it('validates max constraint', () => {
        expect(validateWithType('5', 'number', { max: '10' }).isValid).toBe(true);
        expect(validateWithType('15', 'number', { max: '10' }).isValid).toBe(false);
      });

      it('validates integer constraint', () => {
        expect(validateWithType('5', 'number', { integer: true }).isValid).toBe(true);
        expect(validateWithType('5.5', 'number', { integer: true }).isValid).toBe(false);
      });

      it('allows empty values', () => {
        expect(validateWithType('', 'number', {}).isValid).toBe(true);
      });
    });

    describe('boolean', () => {
      it('validates true/false values', () => {
        expect(validateWithType('true', 'boolean', {}).isValid).toBe(true);
        expect(validateWithType('false', 'boolean', {}).isValid).toBe(true);
        expect(validateWithType('yes', 'boolean', {}).isValid).toBe(false);
      });

      it('allows empty values', () => {
        expect(validateWithType('', 'boolean', {}).isValid).toBe(true);
      });
    });

    describe('choices', () => {
      it('validates value is in choices (new format)', () => {
        expect(validateWithType('a', 'choices', { options: ['a', 'b', 'c'] }).isValid).toBe(true);
        expect(validateWithType('b', 'choices', { options: ['a', 'b', 'c'] }).isValid).toBe(true);
        expect(validateWithType('d', 'choices', { options: ['a', 'b', 'c'] }).isValid).toBe(false);
      });

      it('validates value is in choices (old format)', () => {
        expect(validateWithType('a', 'choices', ['a', 'b', 'c']).isValid).toBe(true);
        expect(validateWithType('d', 'choices', ['a', 'b', 'c']).isValid).toBe(false);
      });

      it('returns error message for invalid value', () => {
        const result = validateWithType('c', 'choices', { options: ['a', 'b'] });
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('a, b');
      });
    });

    describe('date', () => {
      it('validates ISO date format', () => {
        expect(validateWithType('2024-01-15', 'date', {}).isValid).toBe(true);
        expect(validateWithType('2024-1-15', 'date', {}).isValid).toBe(false);
        expect(validateWithType('01-15-2024', 'date', {}).isValid).toBe(false);
      });

      it('allows empty values', () => {
        expect(validateWithType('', 'date', {}).isValid).toBe(true);
      });
    });

    describe('email', () => {
      it('validates email format', () => {
        expect(validateWithType('test@example.com', 'email', {}).isValid).toBe(true);
        expect(validateWithType('invalid-email', 'email', {}).isValid).toBe(false);
      });

      it('allows empty values', () => {
        expect(validateWithType('', 'email', {}).isValid).toBe(true);
      });
    });

    describe('url', () => {
      it('validates URL format', () => {
        expect(validateWithType('https://example.com', 'url', {}).isValid).toBe(true);
        expect(validateWithType('not-a-url', 'url', {}).isValid).toBe(false);
      });

      it('allows empty values', () => {
        expect(validateWithType('', 'url', {}).isValid).toBe(true);
      });
    });

    it('returns valid for unknown types', () => {
      expect(validateWithType('anything', 'unknownType', {}).isValid).toBe(true);
    });
  });

  describe('validateWithDecorators', () => {
    it('validates against type decorator', () => {
      const decorators = [{ type: 'choices', args: { options: ['a', 'b', 'c'] } }];
      expect(validateWithDecorators('a', decorators).isValid).toBe(true);
      expect(validateWithDecorators('d', decorators).isValid).toBe(false);
    });

    it('validates required decorator', () => {
      const decorators = [{ type: 'required', args: {} }];
      expect(validateWithDecorators('hello', decorators).isValid).toBe(true);
      expect(validateWithDecorators('', decorators).isValid).toBe(false);
      expect(validateWithDecorators('   ', decorators).isValid).toBe(false);
    });

    it('validates against multiple decorators', () => {
      const decorators = [
        { type: 'choices', args: { options: ['a', 'b', 'c'] } },
        { type: 'required', args: {} }
      ];
      expect(validateWithDecorators('a', decorators).isValid).toBe(true);
      expect(validateWithDecorators('', decorators).isValid).toBe(false);
      expect(validateWithDecorators('d', decorators).isValid).toBe(false);
    });

    it('collects all errors', () => {
      const decorators = [
        { type: 'choices', args: { options: ['a', 'b'] } },
        { type: 'required', args: {} }
      ];
      // Empty string fails both: not in choices AND required
      const result = validateWithDecorators('', decorators);
      expect(result.errors.length).toBe(2);
    });

    it('returns valid for empty decorators array', () => {
      expect(validateWithDecorators('anything', []).isValid).toBe(true);
      expect(validateWithDecorators('anything', null).isValid).toBe(true);
    });
  });

  describe('getDefaultValueForDecorators', () => {
    it('returns first choice for choices type (new format)', () => {
      const decorators = [{ type: 'choices', args: { options: ['first', 'second'] } }];
      expect(getDefaultValueForDecorators(decorators)).toBe('first');
    });

    it('returns first choice for choices type (old format)', () => {
      const decorators = [{ type: 'choices', args: ['first', 'second'] }];
      expect(getDefaultValueForDecorators(decorators)).toBe('first');
    });

    it('returns true for boolean type', () => {
      const decorators = [{ type: 'boolean', args: {} }];
      expect(getDefaultValueForDecorators(decorators)).toBe('true');
    });

    it('returns empty string for string type', () => {
      const decorators = [{ type: 'string', args: {} }];
      expect(getDefaultValueForDecorators(decorators)).toBe('');
    });

    it('returns empty string for empty array', () => {
      expect(getDefaultValueForDecorators([])).toBe('');
      expect(getDefaultValueForDecorators(null)).toBe('');
    });
  });

  describe('getVisualRenderer', () => {
    it('returns renderer for choices type', () => {
      const decorators = [{ type: 'choices', args: { options: ['a', 'b'] } }];
      const result = getVisualRenderer(decorators);
      expect(result).not.toBeNull();
      expect(typeof result.render).toBe('function');
      expect(result.decorator).toEqual(decorators[0]);
    });

    it('returns renderer for boolean type', () => {
      const decorators = [{ type: 'boolean', args: {} }];
      const result = getVisualRenderer(decorators);
      expect(result).not.toBeNull();
      expect(typeof result.render).toBe('function');
    });

    it('returns null for types without visual renderer', () => {
      const decorators = [{ type: 'string', args: {} }];
      expect(getVisualRenderer(decorators)).toBeNull();
    });

    it('returns null for empty array', () => {
      expect(getVisualRenderer([])).toBeNull();
      expect(getVisualRenderer(null)).toBeNull();
    });
  });

  describe('formatDecoratorSyntax', () => {
    it('formats choices with args (new format)', () => {
      const decorator = { type: 'choices', args: { options: ['a', 'b', 'c'] } };
      expect(formatDecoratorSyntax(decorator)).toBe('@choices("a", "b", "c")');
    });

    it('formats choices with args (old format)', () => {
      const decorator = { type: 'choices', args: ['a', 'b', 'c'] };
      expect(formatDecoratorSyntax(decorator)).toBe('@choices("a", "b", "c")');
    });

    it('formats type without args', () => {
      const decorator = { type: 'boolean', args: {} };
      expect(formatDecoratorSyntax(decorator)).toBe('@boolean');
    });

    it('formats string with pattern', () => {
      const decorator = { type: 'string', args: { pattern: '^[0-9]+$' } };
      expect(formatDecoratorSyntax(decorator)).toBe('@string(pattern="^[0-9]+$")');
    });

    it('formats number with constraints', () => {
      const decorator = { type: 'number', args: { min: '0', max: '100', integer: true } };
      const result = formatDecoratorSyntax(decorator);
      expect(result).toContain('@number');
      expect(result).toContain('min="0"');
      expect(result).toContain('max="100"');
      expect(result).toContain('integer=true');
    });
  });

  describe('formatDecoratorsSyntax', () => {
    it('formats multiple decorators', () => {
      const decorators = [
        { type: 'choices', args: { options: ['a', 'b'] } },
        { type: 'required', args: {} }
      ];
      expect(formatDecoratorsSyntax(decorators)).toBe('@choices("a", "b") @required');
    });

    it('returns empty string for empty array', () => {
      expect(formatDecoratorsSyntax([])).toBe('');
      expect(formatDecoratorsSyntax(null)).toBe('');
    });
  });

  // Legacy API compatibility tests
  describe('Legacy API', () => {
    it('getDecorator maps to getType', () => {
      expect(getDecorator('choices')).toEqual(getType('choices'));
    });

    it('hasDecorator maps to hasType', () => {
      expect(hasDecorator('choices')).toBe(hasType('choices'));
    });

    it('getDecoratorNames maps to getTypeNames', () => {
      expect(getDecoratorNames()).toEqual(getTypeNames());
    });

    it('getAllDecorators maps to getAllTypes', () => {
      expect(getAllDecorators()).toEqual(getAllTypes());
    });

    it('validateWithDecorator works with old format', () => {
      const decorator = { type: 'choices', args: ['a', 'b', 'c'] };
      expect(validateWithDecorator('a', decorator).isValid).toBe(true);
      expect(validateWithDecorator('d', decorator).isValid).toBe(false);
    });
  });
});
