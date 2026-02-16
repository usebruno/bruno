/**
 * Type Registry - Central registry for all param types.
 * Each type defines validation, visual rendering, and form options.
 */

import React, { useRef, forwardRef } from 'react';
import Dropdown from 'components/Dropdown';
import { IconChevronDown, IconCheck } from '@tabler/icons';

// ============================================
// Visual Components for specific types
// ============================================

const ChoicesTrigger = forwardRef(({ value, isValid }, ref) => (
  <div ref={ref} className={`choices-trigger ${!isValid ? 'error' : ''}`}>
    <span className="choices-value">{value || 'Select...'}</span>
    <IconChevronDown size={14} strokeWidth={1.5} className="choices-chevron" />
  </div>
));

// Helper to get options from args (supports both old array format and new object format)
const getOptionsFromArgs = (args) => {
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
};

const ChoicesDropdown = ({ value, args, onChange, isValid }) => {
  const options = getOptionsFromArgs(args);
  const dropdownRef = useRef(null);

  const handleSelect = (choice) => {
    onChange(choice);
    if (dropdownRef.current) {
      dropdownRef.current.hide();
    }
  };

  return (
    <Dropdown
      onCreate={(ref) => (dropdownRef.current = ref)}
      icon={<ChoicesTrigger value={value} isValid={isValid} />}
      placement="bottom-start"
      appendTo={() => document.body}
    >
      <div className="choices-menu">
        {!options.includes(value) && value && (
          <div className="dropdown-item disabled" onClick={() => handleSelect(value)}>
            <span className="dropdown-label">{value} (invalid)</span>
          </div>
        )}
        {options.map((choice) => (
          <div
            key={choice}
            className={`dropdown-item ${value === choice ? 'dropdown-item-active' : ''}`}
            onClick={() => handleSelect(choice)}
          >
            <span className="dropdown-label">{choice}</span>
            {value === choice && (
              <span className="dropdown-right-section">
                <IconCheck size={14} strokeWidth={2} />
              </span>
            )}
          </div>
        ))}
      </div>
    </Dropdown>
  );
};

const BooleanTrigger = forwardRef(({ value, isValid }, ref) => (
  <div ref={ref} className={`choices-trigger ${!isValid ? 'error' : ''}`}>
    <span className="choices-value">{value === '' ? 'Select...' : value}</span>
    <IconChevronDown size={14} strokeWidth={1.5} className="choices-chevron" />
  </div>
));

const BooleanDropdown = ({ value, onChange, isValid }) => {
  const dropdownRef = useRef(null);
  const options = ['true', 'false'];

  const handleSelect = (choice) => {
    onChange(choice);
    if (dropdownRef.current) {
      dropdownRef.current.hide();
    }
  };

  return (
    <Dropdown
      onCreate={(ref) => (dropdownRef.current = ref)}
      icon={<BooleanTrigger value={value} isValid={isValid} />}
      placement="bottom-start"
      appendTo={() => document.body}
    >
      <div className="choices-menu">
        {options.map((choice) => (
          <div
            key={choice}
            className={`dropdown-item ${value === choice ? 'dropdown-item-active' : ''}`}
            onClick={() => handleSelect(choice)}
          >
            <span className="dropdown-label">{choice}</span>
            {value === choice && (
              <span className="dropdown-right-section">
                <IconCheck size={14} strokeWidth={2} />
              </span>
            )}
          </div>
        ))}
      </div>
    </Dropdown>
  );
};

// ============================================
// Type Definitions
// ============================================

const types = {
  string: {
    name: 'string',
    label: 'String',
    description: 'Text value with optional pattern validation',
    renderVisual: null, // Uses default text input
    validate: (value, args) => {
      if (args?.pattern) {
        try {
          const regex = new RegExp(args.pattern);
          const isValid = regex.test(value || '');
          return { isValid, error: isValid ? null : `Value must match pattern: ${args.pattern}` };
        } catch (e) {
          return { isValid: true, error: null }; // Invalid regex, skip validation
        }
      }
      return { isValid: true };
    },
    getDefaultValue: () => '',
    formFields: [
      { key: 'pattern', label: 'Pattern (Regex)', type: 'text', placeholder: 'e.g., ^[a-zA-Z]+$' }
    ]
  },

  number: {
    name: 'number',
    label: 'Number',
    description: 'Numeric value with optional min/max constraints',
    renderVisual: null, // Uses default text input with validation
    validate: (value, args) => {
      if (value === '' || value === null || value === undefined) {
        return { isValid: true }; // Empty is valid (use required for non-empty)
      }

      const num = Number(value);
      if (isNaN(num)) {
        return { isValid: false, error: 'Value must be a valid number' };
      }

      if (args?.integer && !Number.isInteger(num)) {
        return { isValid: false, error: 'Value must be an integer' };
      }

      if (args?.min !== undefined && args.min !== '' && num < Number(args.min)) {
        return { isValid: false, error: `Value must be at least ${args.min}` };
      }

      if (args?.max !== undefined && args.max !== '' && num > Number(args.max)) {
        return { isValid: false, error: `Value must be at most ${args.max}` };
      }

      return { isValid: true };
    },
    getDefaultValue: (args) => args?.min !== undefined ? String(args.min) : '',
    formFields: [
      { key: 'min', label: 'Min', type: 'number', placeholder: 'Minimum value' },
      { key: 'max', label: 'Max', type: 'number', placeholder: 'Maximum value' },
      { key: 'integer', label: 'Integer only', type: 'checkbox' }
    ]
  },

  boolean: {
    name: 'boolean',
    label: 'Boolean',
    description: 'True or false value',
    renderVisual: ({ value, onChange, isValid }) => (
      <BooleanDropdown value={value} onChange={onChange} isValid={isValid} />
    ),
    validate: (value) => {
      if (value === '' || value === null || value === undefined) {
        return { isValid: true };
      }
      const isValid = value === 'true' || value === 'false';
      return { isValid, error: isValid ? null : 'Value must be true or false' };
    },
    getDefaultValue: () => 'true',
    formFields: []
  },

  choices: {
    name: 'choices',
    label: 'Choices',
    description: 'Restricts value to a list of predefined options',
    renderVisual: ({ value, args, onChange, isValid }) => (
      <ChoicesDropdown value={value} args={args} onChange={onChange} isValid={isValid} />
    ),
    validate: (value, args) => {
      const options = getOptionsFromArgs(args);
      if (options.length === 0) return { isValid: true };
      const isValid = options.includes(value);
      return { isValid, error: isValid ? null : `Value must be one of: ${options.join(', ')}` };
    },
    getDefaultValue: (args) => {
      const options = getOptionsFromArgs(args);
      return options.length > 0 ? String(options[0]) : '';
    },
    formFields: [
      { key: 'options', label: 'Options', type: 'chips', placeholder: 'Type and press Enter to add...' }
    ]
  },

  date: {
    name: 'date',
    label: 'Date',
    description: 'ISO date format (YYYY-MM-DD)',
    renderVisual: null,
    validate: (value) => {
      if (value === '' || value === null || value === undefined) {
        return { isValid: true };
      }
      // ISO date format: YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(value)) {
        return { isValid: false, error: 'Value must be in ISO date format (YYYY-MM-DD)' };
      }
      const date = new Date(value);
      const isValid = !isNaN(date.getTime());
      return { isValid, error: isValid ? null : 'Invalid date' };
    },
    getDefaultValue: () => '',
    formFields: []
  },

  email: {
    name: 'email',
    label: 'Email',
    description: 'Valid email address',
    renderVisual: null,
    validate: (value) => {
      if (value === '' || value === null || value === undefined) {
        return { isValid: true };
      }
      // Simple email regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValid = emailRegex.test(value);
      return { isValid, error: isValid ? null : 'Value must be a valid email address' };
    },
    getDefaultValue: () => '',
    formFields: []
  },

  url: {
    name: 'url',
    label: 'URL',
    description: 'Valid URL',
    renderVisual: null,
    validate: (value) => {
      if (value === '' || value === null || value === undefined) {
        return { isValid: true };
      }
      try {
        new URL(value);
        return { isValid: true };
      } catch {
        return { isValid: false, error: 'Value must be a valid URL' };
      }
    },
    getDefaultValue: () => '',
    formFields: []
  }
};

// ============================================
// Registry API
// ============================================

export function getType(name) {
  return types[name] || null;
}

export function hasType(name) {
  return name in types;
}

export function getTypeNames() {
  return Object.keys(types);
}

export function getAllTypes() {
  return { ...types };
}

export function validateWithType(value, typeName, args) {
  const type = getType(typeName);
  if (!type) return { isValid: true };
  return type.validate(value, args);
}

export function validateWithDecorators(value, decorators) {
  if (!decorators || decorators.length === 0) {
    return { isValid: true, errors: [] };
  }

  const errors = [];

  // Find the main type decorator (not required)
  const typeDecorator = decorators.find((d) => d.type !== 'required');
  if (typeDecorator) {
    const result = validateWithType(value, typeDecorator.type, typeDecorator.args);
    if (!result.isValid && result.error) {
      errors.push(result.error);
    }
  }

  // Check required
  const requiredDecorator = decorators.find((d) => d.type === 'required');
  if (requiredDecorator) {
    const isEmpty = value === null || value === undefined || String(value).trim().length === 0;
    if (isEmpty) {
      errors.push('This field is required');
    }
  }

  return { isValid: errors.length === 0, errors };
}

export function getDefaultValueForDecorators(decorators) {
  if (!decorators || decorators.length === 0) return '';

  const typeDecorator = decorators.find((d) => d.type !== 'required');
  if (typeDecorator) {
    const type = getType(typeDecorator.type);
    if (type) {
      return type.getDefaultValue(typeDecorator.args);
    }
  }

  return '';
}

export function getVisualRenderer(decorators) {
  if (!decorators || decorators.length === 0) return null;

  const typeDecorator = decorators.find((d) => d.type !== 'required');
  if (typeDecorator) {
    const type = getType(typeDecorator.type);
    if (type && type.renderVisual) {
      return { render: type.renderVisual, decorator: typeDecorator };
    }
  }

  return null;
}

// ============================================
// Legacy exports for backwards compatibility
// ============================================

// Map old decorator names to new type names
export function getDecorator(name) {
  return getType(name);
}

export function hasDecorator(name) {
  return hasType(name);
}

export function getDecoratorNames() {
  return getTypeNames();
}

export function getAllDecorators() {
  return getAllTypes();
}

export function validateWithDecorator(value, decorator) {
  return validateWithType(value, decorator.type, decorator.args);
}

export function formatDecoratorSyntax(decorator) {
  if (!decorator || !decorator.type) return '';

  const type = getType(decorator.type);
  if (!type) return `@${decorator.type}`;

  // Format args based on type
  const args = decorator.args;

  // Handle empty args
  if (!args || (Array.isArray(args) && args.length === 0) || (typeof args === 'object' && Object.keys(args).length === 0)) {
    return `@${decorator.type}`;
  }

  // For choices, format options (handle both old array format and new object format)
  if (decorator.type === 'choices') {
    const options = getOptionsFromArgs(args);
    if (options.length > 0) {
      return `@choices(${options.map((o) => JSON.stringify(o)).join(', ')})`;
    }
    return '@choices';
  }

  // Old format: array of args (for backwards compatibility with pattern, etc.)
  if (Array.isArray(args)) {
    if (args.length === 0) return `@${decorator.type}`;
    return `@${decorator.type}(${args.map((a) => JSON.stringify(a)).join(', ')})`;
  }

  // New format: object with named args
  const argParts = [];
  for (const [key, value] of Object.entries(args)) {
    if (value !== undefined && value !== '' && value !== false) {
      argParts.push(`${key}=${JSON.stringify(value)}`);
    }
  }

  return argParts.length > 0 ? `@${decorator.type}(${argParts.join(', ')})` : `@${decorator.type}`;
}

export function formatDecoratorsSyntax(decoratorList) {
  if (!decoratorList || decoratorList.length === 0) return '';
  return decoratorList.map(formatDecoratorSyntax).filter(Boolean).join(' ');
}

export default types;
