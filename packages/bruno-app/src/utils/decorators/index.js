export { parseDecoratorSyntax, formatDecoratorToSyntax, formatDecoratorsToSyntax } from './parser';
export { detectAndParseDecorator } from './detector';
export { validateValueAgainstDecorators, getDecoratorChoices } from './validators';

// Registry exports - use these for new code
export {
  // New type-based API
  getType,
  hasType,
  getTypeNames,
  getAllTypes,
  validateWithType,

  // Decorator-compatible API (works with both old and new)
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
