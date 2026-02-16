import {
  getDecorator,
  hasDecorator,
  getDecoratorNames,
  getAllDecorators,
  validateWithDecorator,
  validateWithDecorators,
  getDefaultValueForDecorators,
  getVisualRenderer,
  formatDecoratorSyntax,
  formatDecoratorsSyntax
} from './registry';

describe('Decorator Registry', () => {
  describe('getDecorator', () => {
    it('returns decorator definition for known decorators', () => {
      const choices = getDecorator('choices');
      expect(choices).not.toBeNull();
      expect(choices.name).toBe('choices');
      expect(typeof choices.validate).toBe('function');
      expect(typeof choices.getDefaultValue).toBe('function');
    });

    it('returns null for unknown decorators', () => {
      expect(getDecorator('unknownDecorator')).toBeNull();
    });
  });

  describe('hasDecorator', () => {
    it('returns true for registered decorators', () => {
      expect(hasDecorator('choices')).toBe(true);
      expect(hasDecorator('required')).toBe(true);
      expect(hasDecorator('pattern')).toBe(true);
    });

    it('returns false for unregistered decorators', () => {
      expect(hasDecorator('unknownDecorator')).toBe(false);
    });
  });

  describe('getDecoratorNames', () => {
    it('returns all registered decorator names', () => {
      const names = getDecoratorNames();
      expect(names).toContain('choices');
      expect(names).toContain('required');
      expect(names).toContain('pattern');
    });
  });

  describe('validateWithDecorator', () => {
    describe('@choices', () => {
      it('validates value is in choices', () => {
        const decorator = { type: 'choices', args: ['a', 'b', 'c'] };
        expect(validateWithDecorator('a', decorator).isValid).toBe(true);
        expect(validateWithDecorator('b', decorator).isValid).toBe(true);
        expect(validateWithDecorator('d', decorator).isValid).toBe(false);
      });

      it('returns error message for invalid value', () => {
        const decorator = { type: 'choices', args: ['a', 'b'] };
        const result = validateWithDecorator('c', decorator);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('a, b');
      });
    });

    describe('@required', () => {
      it('validates non-empty values', () => {
        const decorator = { type: 'required', args: [] };
        expect(validateWithDecorator('hello', decorator).isValid).toBe(true);
        expect(validateWithDecorator('', decorator).isValid).toBe(false);
        expect(validateWithDecorator('   ', decorator).isValid).toBe(false);
      });
    });

    describe('@pattern', () => {
      it('validates value against regex', () => {
        const decorator = { type: 'pattern', args: ['^[0-9]+$'] };
        expect(validateWithDecorator('123', decorator).isValid).toBe(true);
        expect(validateWithDecorator('abc', decorator).isValid).toBe(false);
      });
    });

    it('returns valid for unknown decorators', () => {
      const decorator = { type: 'unknownDecorator', args: [] };
      expect(validateWithDecorator('anything', decorator).isValid).toBe(true);
    });
  });

  describe('validateWithDecorators', () => {
    it('validates against multiple decorators', () => {
      const decorators = [
        { type: 'choices', args: ['a', 'b', 'c'] },
        { type: 'required', args: [] }
      ];
      expect(validateWithDecorators('a', decorators).isValid).toBe(true);
      expect(validateWithDecorators('', decorators).isValid).toBe(false);
      expect(validateWithDecorators('d', decorators).isValid).toBe(false);
    });

    it('collects all errors', () => {
      const decorators = [
        { type: 'choices', args: ['a', 'b'] },
        { type: 'required', args: [] }
      ];
      const result = validateWithDecorators('', decorators);
      expect(result.errors.length).toBe(2);
    });

    it('returns valid for empty decorators array', () => {
      expect(validateWithDecorators('anything', []).isValid).toBe(true);
      expect(validateWithDecorators('anything', null).isValid).toBe(true);
    });
  });

  describe('getDefaultValueForDecorators', () => {
    it('returns first choice for @choices', () => {
      const decorators = [{ type: 'choices', args: ['first', 'second'] }];
      expect(getDefaultValueForDecorators(decorators)).toBe('first');
    });

    it('returns empty string for @required', () => {
      const decorators = [{ type: 'required', args: [] }];
      expect(getDefaultValueForDecorators(decorators)).toBe('');
    });

    it('uses first decorator that provides non-empty default', () => {
      const decorators = [
        { type: 'required', args: [] },
        { type: 'choices', args: ['opt1', 'opt2'] }
      ];
      expect(getDefaultValueForDecorators(decorators)).toBe('opt1');
    });

    it('returns empty string for empty array', () => {
      expect(getDefaultValueForDecorators([])).toBe('');
      expect(getDefaultValueForDecorators(null)).toBe('');
    });
  });

  describe('getVisualRenderer', () => {
    it('returns renderer for @choices', () => {
      const decorators = [{ type: 'choices', args: ['a', 'b'] }];
      const result = getVisualRenderer(decorators);
      expect(result).not.toBeNull();
      expect(typeof result.render).toBe('function');
      expect(result.decorator).toEqual(decorators[0]);
    });

    it('returns null for decorators without visual renderer', () => {
      const decorators = [{ type: 'required', args: [] }];
      expect(getVisualRenderer(decorators)).toBeNull();
    });

    it('returns first visual renderer when multiple decorators', () => {
      const decorators = [
        { type: 'required', args: [] },
        { type: 'choices', args: ['a', 'b'] }
      ];
      const result = getVisualRenderer(decorators);
      expect(result.decorator.type).toBe('choices');
    });

    it('returns null for empty array', () => {
      expect(getVisualRenderer([])).toBeNull();
      expect(getVisualRenderer(null)).toBeNull();
    });
  });

  describe('formatDecoratorSyntax', () => {
    it('formats @choices with args', () => {
      const decorator = { type: 'choices', args: ['a', 'b', 'c'] };
      expect(formatDecoratorSyntax(decorator)).toBe('@choices("a", "b", "c")');
    });

    it('formats decorator without args', () => {
      const decorator = { type: 'required', args: [] };
      expect(formatDecoratorSyntax(decorator)).toBe('@required');
    });

    it('handles numeric args', () => {
      const decorator = { type: 'pattern', args: ['^[0-9]+$'] };
      expect(formatDecoratorSyntax(decorator)).toBe('@pattern("^[0-9]+$")');
    });
  });

  describe('formatDecoratorsSyntax', () => {
    it('formats multiple decorators', () => {
      const decorators = [
        { type: 'choices', args: ['a', 'b'] },
        { type: 'required', args: [] }
      ];
      expect(formatDecoratorsSyntax(decorators)).toBe('@choices("a", "b") @required');
    });

    it('returns empty string for empty array', () => {
      expect(formatDecoratorsSyntax([])).toBe('');
      expect(formatDecoratorsSyntax(null)).toBe('');
    });
  });
});
