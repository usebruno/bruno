/**
 * Decorator Validators
 *
 * Validates values against decorator constraints and extracts decorator options.
 */

/**
 * Validate a value against decorators
 *
 * @param {string} value - The current value
 * @param {Array<{ type: string, args: any[] }>} decorators - Array of decorators
 * @returns {{ isValid: boolean, errors: string[] }}
 *
 * @example
 * validateValueAgainstDecorators('active', [{ type: 'choices', args: ['active', 'inactive'] }])
 * // Returns: { isValid: true, errors: [] }
 *
 * validateValueAgainstDecorators('unknown', [{ type: 'choices', args: ['active', 'inactive'] }])
 * // Returns: { isValid: false, errors: ['Value "unknown" is not in choices: active, inactive'] }
 */
export function validateValueAgainstDecorators(value, decorators) {
  if (!decorators || !Array.isArray(decorators) || decorators.length === 0) {
    return { isValid: true, errors: [] };
  }

  const errors = [];

  for (const decorator of decorators) {
    if (decorator.type === 'choices') {
      const choices = decorator.args || [];
      // Convert all choices to strings for comparison
      const stringChoices = choices.map(String);

      if (value !== undefined && value !== null && value !== '' && !stringChoices.includes(String(value))) {
        errors.push(`Value "${value}" is not in choices: ${stringChoices.join(', ')}`);
      }
    }
    // Add more decorator type validations here as needed
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get the choices from a choices decorator
 *
 * @param {Array<{ type: string, args: any[] }>} decorators - Array of decorators
 * @returns {string[] | null} - Array of choices or null if no choices decorator found
 *
 * @example
 * getDecoratorChoices([{ type: 'choices', args: ['a', 'b', 'c'] }])
 * // Returns: ['a', 'b', 'c']
 *
 * getDecoratorChoices([{ type: 'required', args: [] }])
 * // Returns: null
 */
export function getDecoratorChoices(decorators) {
  if (!decorators || !Array.isArray(decorators)) {
    return null;
  }

  const choicesDecorator = decorators.find((d) => d.type === 'choices');

  if (!choicesDecorator || !choicesDecorator.args || choicesDecorator.args.length === 0) {
    return null;
  }

  // Convert all choices to strings
  return choicesDecorator.args.map(String);
}

/**
 * Check if decorators contain a specific type
 *
 * @param {Array<{ type: string, args: any[] }>} decorators
 * @param {string} type - Decorator type to check for
 * @returns {boolean}
 */
export function hasDecoratorType(decorators, type) {
  if (!decorators || !Array.isArray(decorators)) {
    return false;
  }

  return decorators.some((d) => d.type === type);
}
