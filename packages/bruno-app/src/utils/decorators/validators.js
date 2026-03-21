/**
 * Validates values against decorator constraints
 */

// Helper to get choices array from args (supports both old array format and new object format)
function getChoicesFromArgs(args) {
  if (!args) return [];
  // New format: { options: [...] }
  if (args.options && Array.isArray(args.options)) {
    return args.options;
  }
  // Old format: [...]
  if (Array.isArray(args)) {
    return args;
  }
  return [];
}

export function validateValueAgainstDecorators(value, decorators) {
  if (!decorators || !Array.isArray(decorators) || decorators.length === 0) {
    return { isValid: true, errors: [] };
  }

  const errors = [];

  for (const decorator of decorators) {
    if (decorator.type === 'choices') {
      const choices = getChoicesFromArgs(decorator.args);
      const stringChoices = choices.map(String);

      if (value !== undefined && value !== null && value !== '' && !stringChoices.includes(String(value))) {
        errors.push(`Value "${value}" is not in choices: ${stringChoices.join(', ')}`);
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}

export function getDecoratorChoices(decorators) {
  if (!decorators || !Array.isArray(decorators)) {
    return null;
  }

  const choicesDecorator = decorators.find((d) => d.type === 'choices');
  if (!choicesDecorator) {
    return null;
  }

  const choices = getChoicesFromArgs(choicesDecorator.args);
  if (choices.length === 0) {
    return null;
  }

  return choices.map(String);
}

export function hasDecoratorType(decorators, type) {
  if (!decorators || !Array.isArray(decorators)) {
    return false;
  }
  return decorators.some((d) => d.type === type);
}
