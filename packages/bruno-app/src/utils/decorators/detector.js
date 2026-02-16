/**
 * Decorator Detector
 *
 * Detects if a user's input is a decorator syntax and parses it.
 * Used on blur to determine if the input should be converted to a decorator.
 */

import { parseDecoratorSyntax } from './parser';
import { getDecorator } from './registry';

/**
 * Detect if input value is decorator syntax and parse it
 *
 * This is called on blur to determine if user typed a decorator.
 * Returns the parsed decorator info or treats the input as a regular value.
 *
 * @param {string} input - The user's input from the value field
 * @returns {{
 *   isDecorator: boolean,
 *   decorator: object | null,
 *   defaultValue: string,
 *   warning: string | null
 * }}
 *
 * @example
 * // Valid decorator
 * detectAndParseDecorator('@choices("a", "b", "c")')
 * // Returns: { isDecorator: true, decorator: { type: 'choices', args: ['a', 'b', 'c'] }, defaultValue: 'a', warning: null }
 *
 * // Regular value
 * detectAndParseDecorator('hello world')
 * // Returns: { isDecorator: false, decorator: null, defaultValue: 'hello world', warning: null }
 *
 * // Invalid decorator (shows warning but treats as value)
 * detectAndParseDecorator('@choices("unclosed')
 * // Returns: { isDecorator: false, decorator: null, defaultValue: '@choices("unclosed', warning: 'Invalid decorator arguments' }
 */
export function detectAndParseDecorator(input) {
  if (!input || typeof input !== 'string') {
    return {
      isDecorator: false,
      decorator: null,
      defaultValue: input || '',
      warning: null
    };
  }

  const trimmed = input.trim();

  // Not a decorator if doesn't start with @
  if (!trimmed.startsWith('@')) {
    return {
      isDecorator: false,
      decorator: null,
      defaultValue: input,
      warning: null
    };
  }

  const { decorator, error } = parseDecoratorSyntax(trimmed);

  // Invalid decorator syntax - treat as value but show warning
  if (error) {
    return {
      isDecorator: false,
      decorator: null,
      defaultValue: input,
      warning: error
    };
  }

  // Valid decorator found
  if (decorator) {
    // Get default value from registry
    const def = getDecorator(decorator.type);
    const defaultValue = def ? def.getDefaultValue(decorator.args) : '';

    return {
      isDecorator: true,
      decorator,
      defaultValue,
      warning: null
    };
  }

  // No decorator detected
  return {
    isDecorator: false,
    decorator: null,
    defaultValue: input,
    warning: null
  };
}
