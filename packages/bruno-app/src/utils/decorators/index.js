export { parseDecoratorSyntax, formatDecoratorToSyntax, formatDecoratorsToSyntax } from './parser';
export { detectAndParseDecorator } from './detector';
export { validateValueAgainstDecorators, getDecoratorChoices } from './validators';

// Registry exports - use these for new code
export {
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
