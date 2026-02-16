/**
 * Validates values against decorator constraints
 */

export function validateValueAgainstDecorators(value, decorators) {
  if (!decorators || !Array.isArray(decorators) || decorators.length === 0) {
    return { isValid: true, errors: [] };
  }

  const errors = [];

  for (const decorator of decorators) {
    if (decorator.type === 'choices') {
      const choices = decorator.args || [];
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
  if (!choicesDecorator || !choicesDecorator.args || choicesDecorator.args.length === 0) {
    return null;
  }

  return choicesDecorator.args.map(String);
}

export function hasDecoratorType(decorators, type) {
  if (!decorators || !Array.isArray(decorators)) {
    return false;
  }
  return decorators.some((d) => d.type === type);
}
