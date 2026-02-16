/**
 * Parses decorator syntax like @choices("opt1", "opt2") into structured objects
 */

const DECORATOR_PATTERN = /^@(\w+)(?:\((.*)\))?$/;

export function parseDecoratorSyntax(input) {
  if (!input || typeof input !== 'string') {
    return { decorator: null, error: null };
  }

  const trimmed = input.trim();
  if (!trimmed.startsWith('@')) {
    return { decorator: null, error: null };
  }

  const match = trimmed.match(DECORATOR_PATTERN);
  if (!match) {
    return { decorator: null, error: 'Invalid decorator syntax' };
  }

  const [, type, argsString] = match;

  if (!argsString || argsString.trim() === '') {
    return { decorator: { type, args: [] }, error: null };
  }

  try {
    const args = JSON.parse(`[${argsString}]`);
    return { decorator: { type, args }, error: null };
  } catch (e) {
    return { decorator: null, error: 'Invalid decorator arguments' };
  }
}

export function formatDecoratorToSyntax(decorator) {
  if (!decorator || !decorator.type) {
    return '';
  }

  if (!decorator.args || decorator.args.length === 0) {
    return `@${decorator.type}`;
  }

  const argsStr = decorator.args.map((arg) => JSON.stringify(arg)).join(', ');
  return `@${decorator.type}(${argsStr})`;
}

export function formatDecoratorsToSyntax(decorators) {
  if (!decorators || !Array.isArray(decorators) || decorators.length === 0) {
    return '';
  }
  return decorators.map(formatDecoratorToSyntax).join(' ');
}
