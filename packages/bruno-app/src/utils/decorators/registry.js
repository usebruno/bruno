/**
 * Decorator Registry
 *
 * Central registry for all decorators. To add a new decorator:
 * 1. Create a new entry in the `decorators` object below
 * 2. Implement the required interface
 *
 * Each decorator must implement:
 * - name: string - Unique identifier (e.g., 'choices')
 * - description: string - Human-readable description
 * - renderVisual: function | null - React component for Visual mode (receives { value, args, onChange, onSave, onRun })
 * - validate: function - Validates value against decorator (returns { isValid: boolean, error?: string })
 * - getDefaultValue: function - Returns default value when decorator is first applied
 * - parseArgs: function - Parses args from string (called during syntax parsing)
 * - formatArgs: function - Formats args to string (called during syntax serialization)
 */

import React from 'react';

/**
 * @typedef {Object} DecoratorDefinition
 * @property {string} name - Unique decorator identifier
 * @property {string} description - Human-readable description
 * @property {Function|null} renderVisual - Component to render in Visual mode, or null for default input
 * @property {Function} validate - (value, args) => { isValid: boolean, error?: string }
 * @property {Function} getDefaultValue - (args) => string
 * @property {Function} parseArgs - (argsArray) => processedArgs
 * @property {Function} formatArgs - (args) => string for display
 */

/**
 * Choices Dropdown Component for Visual mode
 */
const ChoicesDropdown = ({ value, args, onChange, isValid }) => {
  const choices = args || [];

  return (
    <select
      className={`choices-dropdown ${!isValid ? 'error' : ''}`}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    >
      {/* Show invalid value option if current value not in choices */}
      {!choices.includes(value) && value && (
        <option value={value} disabled>
          {value} (invalid)
        </option>
      )}
      {choices.map((choice) => (
        <option key={choice} value={choice}>
          {choice}
        </option>
      ))}
    </select>
  );
};

/**
 * Decorator Registry
 *
 * Add new decorators here. Each decorator is an object with the interface defined above.
 */
const decorators = {
  /**
   * @choices("option1", "option2", "option3")
   * Restricts the value to a predefined list of choices.
   * Renders as a dropdown in Visual mode.
   */
  choices: {
    name: 'choices',
    description: 'Restricts value to a list of choices',

    renderVisual: ({ value, args, onChange, isValid }) => (
      <ChoicesDropdown value={value} args={args} onChange={onChange} isValid={isValid} />
    ),

    validate: (value, args) => {
      if (!args || args.length === 0) {
        return { isValid: true };
      }
      const isValid = args.includes(value);
      return {
        isValid,
        error: isValid ? null : `Value must be one of: ${args.join(', ')}`
      };
    },

    getDefaultValue: (args) => {
      // Default to first choice
      return args && args.length > 0 ? String(args[0]) : '';
    },

    parseArgs: (args) => {
      // Args should be an array of string choices
      return Array.isArray(args) ? args.map(String) : [];
    },

    formatArgs: (args) => {
      if (!args || args.length === 0) return '';
      return args.map((arg) => JSON.stringify(arg)).join(', ');
    }
  },

  /**
   * @required
   * Marks the field as required (non-empty).
   * No special Visual mode - uses default value input.
   */
  required: {
    name: 'required',
    description: 'Marks the field as required (non-empty)',

    renderVisual: null, // Use default value input

    validate: (value) => {
      const isValid = value !== null && value !== undefined && String(value).trim().length > 0;
      return {
        isValid,
        error: isValid ? null : 'This field is required'
      };
    },

    getDefaultValue: () => '',

    parseArgs: () => [],

    formatArgs: () => ''
  },

  /**
   * @pattern("regex")
   * Validates value against a regex pattern.
   */
  pattern: {
    name: 'pattern',
    description: 'Validates value against a regex pattern',

    renderVisual: null,

    validate: (value, args) => {
      if (!args || args.length === 0) {
        return { isValid: true };
      }
      try {
        const regex = new RegExp(args[0]);
        const isValid = regex.test(value || '');
        return {
          isValid,
          error: isValid ? null : `Value must match pattern: ${args[0]}`
        };
      } catch (e) {
        return { isValid: true, error: null }; // Invalid regex, skip validation
      }
    },

    getDefaultValue: () => '',

    parseArgs: (args) => args,

    formatArgs: (args) => {
      if (!args || args.length === 0) return '';
      return JSON.stringify(args[0]);
    }
  }
};

// ============================================================================
// Registry API - Use these functions to interact with decorators
// ============================================================================

/**
 * Get a decorator definition by name
 * @param {string} name - Decorator name (e.g., 'choices')
 * @returns {DecoratorDefinition|null}
 */
export function getDecorator(name) {
  return decorators[name] || null;
}

/**
 * Check if a decorator exists
 * @param {string} name - Decorator name
 * @returns {boolean}
 */
export function hasDecorator(name) {
  return name in decorators;
}

/**
 * Get all registered decorator names
 * @returns {string[]}
 */
export function getDecoratorNames() {
  return Object.keys(decorators);
}

/**
 * Get all registered decorators
 * @returns {Object.<string, DecoratorDefinition>}
 */
export function getAllDecorators() {
  return { ...decorators };
}

/**
 * Validate a value against a single decorator
 * @param {string} value - The value to validate
 * @param {{ type: string, args: any[] }} decorator - The decorator object
 * @returns {{ isValid: boolean, error?: string }}
 */
export function validateWithDecorator(value, decorator) {
  const def = getDecorator(decorator.type);
  if (!def) {
    // Unknown decorator, skip validation
    return { isValid: true };
  }
  return def.validate(value, decorator.args);
}

/**
 * Validate a value against multiple decorators
 * @param {string} value - The value to validate
 * @param {Array<{ type: string, args: any[] }>} decorators - Array of decorator objects
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateWithDecorators(value, decoratorList) {
  if (!decoratorList || decoratorList.length === 0) {
    return { isValid: true, errors: [] };
  }

  const errors = [];
  for (const decorator of decoratorList) {
    const result = validateWithDecorator(value, decorator);
    if (!result.isValid && result.error) {
      errors.push(result.error);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get default value for decorators
 * @param {Array<{ type: string, args: any[] }>} decorators - Array of decorator objects
 * @returns {string}
 */
export function getDefaultValueForDecorators(decoratorList) {
  if (!decoratorList || decoratorList.length === 0) {
    return '';
  }

  // Use the first decorator that provides a meaningful default
  for (const decorator of decoratorList) {
    const def = getDecorator(decorator.type);
    if (def) {
      const defaultValue = def.getDefaultValue(decorator.args);
      if (defaultValue !== '') {
        return defaultValue;
      }
    }
  }

  return '';
}

/**
 * Get the Visual mode renderer for decorators
 * Returns the first decorator's visual renderer that exists
 * @param {Array<{ type: string, args: any[] }>} decorators
 * @returns {{ render: Function, decorator: object }|null}
 */
export function getVisualRenderer(decoratorList) {
  if (!decoratorList || decoratorList.length === 0) {
    return null;
  }

  for (const decorator of decoratorList) {
    const def = getDecorator(decorator.type);
    if (def && def.renderVisual) {
      return {
        render: def.renderVisual,
        decorator
      };
    }
  }

  return null;
}

/**
 * Format decorator to syntax string
 * @param {{ type: string, args: any[] }} decorator
 * @returns {string}
 */
export function formatDecoratorSyntax(decorator) {
  if (!decorator || !decorator.type) {
    return '';
  }

  const def = getDecorator(decorator.type);

  // Format args using registry definition or fallback
  let argsStr = '';
  if (decorator.args && decorator.args.length > 0) {
    if (def && def.formatArgs) {
      argsStr = def.formatArgs(decorator.args);
    } else {
      // Fallback: JSON stringify each arg
      argsStr = decorator.args.map((arg) => JSON.stringify(arg)).join(', ');
    }
  }

  // Return without parentheses if no args
  if (!argsStr) {
    return `@${decorator.type}`;
  }

  return `@${decorator.type}(${argsStr})`;
}

/**
 * Format multiple decorators to syntax string
 * @param {Array<{ type: string, args: any[] }>} decorators
 * @returns {string}
 */
export function formatDecoratorsSyntax(decoratorList) {
  if (!decoratorList || decoratorList.length === 0) {
    return '';
  }

  return decoratorList.map(formatDecoratorSyntax).filter(Boolean).join(' ');
}

export default decorators;
