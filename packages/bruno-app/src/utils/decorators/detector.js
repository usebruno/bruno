/**
 * Detects if user input is decorator syntax and parses it.
 * Used on blur to determine if input should be converted to a decorator.
 */

import { parseDecoratorSyntax } from './parser';
import { getDecorator } from './registry';

export function detectAndParseDecorator(input) {
  if (!input || typeof input !== 'string') {
    return { isDecorator: false, decorator: null, defaultValue: input || '', warning: null };
  }

  const trimmed = input.trim();
  if (!trimmed.startsWith('@')) {
    return { isDecorator: false, decorator: null, defaultValue: input, warning: null };
  }

  const { decorator, error } = parseDecoratorSyntax(trimmed);

  if (error) {
    return { isDecorator: false, decorator: null, defaultValue: input, warning: error };
  }

  if (decorator) {
    const def = getDecorator(decorator.type);
    const defaultValue = def ? def.getDefaultValue(decorator.args) : '';
    return { isDecorator: true, decorator, defaultValue, warning: null };
  }

  return { isDecorator: false, decorator: null, defaultValue: input, warning: null };
}
