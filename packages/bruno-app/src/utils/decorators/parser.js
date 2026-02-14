/**
 * Decorator Parser
 *
 * Parses decorator syntax like @choices("opt1", "opt2", "opt3") into structured objects
 * and formats decorator objects back to syntax strings.
 */

/**
 * Regex to match decorator syntax: @name("arg1", "arg2") or @name or @name()
 * Group 1: decorator name
 * Group 2: arguments string (inside parentheses), may be empty
 */
const DECORATOR_PATTERN = /^@(\w+)(?:\((.*)\))?$/;

/**
 * Parse a decorator syntax string into a structured decorator object
 *
 * @param {string} input - e.g., '@choices("active", "inactive", "pending")'
 * @returns {{ decorator: object | null, error: string | null }}
 *
 * @example
 * parseDecoratorSyntax('@choices("a", "b", "c")')
 * // Returns: { decorator: { type: 'choices', args: ['a', 'b', 'c'] }, error: null }
 *
 * parseDecoratorSyntax('regular value')
 * // Returns: { decorator: null, error: null }
 *
 * parseDecoratorSyntax('@choices("unclosed')
 * // Returns: { decorator: null, error: 'Invalid decorator arguments' }
 */
export function parseDecoratorSyntax(input) {
  if (!input || typeof input !== 'string') {
    return { decorator: null, error: null };
  }

  const trimmed = input.trim();

  // Not a decorator if doesn't start with @
  if (!trimmed.startsWith('@')) {
    return { decorator: null, error: null };
  }

  const match = trimmed.match(DECORATOR_PATTERN);
  if (!match) {
    return { decorator: null, error: 'Invalid decorator syntax' };
  }

  const [, type, argsString] = match;

  // Decorator without arguments (e.g., @required or @required())
  if (!argsString || argsString.trim() === '') {
    return {
      decorator: { type, args: [] },
      error: null
    };
  }

  // Parse arguments - they should be valid JSON values
  try {
    // Wrap in array brackets to parse as JSON array
    const args = JSON.parse(`[${argsString}]`);
    return {
      decorator: { type, args },
      error: null
    };
  } catch (e) {
    return { decorator: null, error: 'Invalid decorator arguments' };
  }
}

/**
 * Format a decorator object to syntax string
 *
 * @param {{ type: string, args: any[] }} decorator
 * @returns {string}
 *
 * @example
 * formatDecoratorToSyntax({ type: 'choices', args: ['a', 'b', 'c'] })
 * // Returns: '@choices("a", "b", "c")'
 *
 * formatDecoratorToSyntax({ type: 'required', args: [] })
 * // Returns: '@required'
 */
export function formatDecoratorToSyntax(decorator) {
  if (!decorator || !decorator.type) {
    return '';
  }

  // Decorator without arguments
  if (!decorator.args || decorator.args.length === 0) {
    return `@${decorator.type}`;
  }

  // Format arguments as JSON values
  const argsStr = decorator.args.map((arg) => JSON.stringify(arg)).join(', ');

  return `@${decorator.type}(${argsStr})`;
}

/**
 * Format multiple decorators to a combined syntax string
 *
 * @param {Array<{ type: string, args: any[] }>} decorators
 * @returns {string}
 *
 * @example
 * formatDecoratorsToSyntax([
 *   { type: 'choices', args: ['a', 'b'] },
 *   { type: 'required', args: [] }
 * ])
 * // Returns: '@choices("a", "b") @required'
 */
export function formatDecoratorsToSyntax(decorators) {
  if (!decorators || !Array.isArray(decorators) || decorators.length === 0) {
    return '';
  }

  return decorators.map(formatDecoratorToSyntax).join(' ');
}
