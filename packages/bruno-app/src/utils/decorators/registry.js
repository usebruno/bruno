/**
 * Decorator Registry - Central registry for all decorators.
 * To add a new decorator, add an entry to the `decorators` object below.
 */

import React, { useRef, forwardRef } from 'react';
import Dropdown from 'components/Dropdown';
import { IconChevronDown, IconCheck } from '@tabler/icons';

const ChoicesTrigger = forwardRef(({ value, isValid }, ref) => (
  <div ref={ref} className={`choices-trigger ${!isValid ? 'error' : ''}`}>
    <span className="choices-value">{value || 'Select...'}</span>
    <IconChevronDown size={14} strokeWidth={1.5} className="choices-chevron" />
  </div>
));

const ChoicesDropdown = ({ value, args, onChange, isValid }) => {
  const choices = args || [];
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
        {!choices.includes(value) && value && (
          <div className="dropdown-item disabled" onClick={() => handleSelect(value)}>
            <span className="dropdown-label">{value} (invalid)</span>
          </div>
        )}
        {choices.map((choice) => (
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

const decorators = {
  choices: {
    name: 'choices',
    description: 'Restricts value to a list of choices',
    renderVisual: ({ value, args, onChange, isValid }) => (
      <ChoicesDropdown value={value} args={args} onChange={onChange} isValid={isValid} />
    ),
    validate: (value, args) => {
      if (!args || args.length === 0) return { isValid: true };
      const isValid = args.includes(value);
      return { isValid, error: isValid ? null : `Value must be one of: ${args.join(', ')}` };
    },
    getDefaultValue: (args) => (args && args.length > 0 ? String(args[0]) : ''),
    parseArgs: (args) => (Array.isArray(args) ? args.map(String) : []),
    formatArgs: (args) => (!args || args.length === 0 ? '' : args.map((arg) => JSON.stringify(arg)).join(', '))
  },

  required: {
    name: 'required',
    description: 'Marks the field as required (non-empty)',
    renderVisual: null,
    validate: (value) => {
      const isValid = value !== null && value !== undefined && String(value).trim().length > 0;
      return { isValid, error: isValid ? null : 'This field is required' };
    },
    getDefaultValue: () => '',
    parseArgs: () => [],
    formatArgs: () => ''
  },

  pattern: {
    name: 'pattern',
    description: 'Validates value against a regex pattern',
    renderVisual: null,
    validate: (value, args) => {
      if (!args || args.length === 0) return { isValid: true };
      try {
        const regex = new RegExp(args[0]);
        const isValid = regex.test(value || '');
        return { isValid, error: isValid ? null : `Value must match pattern: ${args[0]}` };
      } catch (e) {
        return { isValid: true, error: null };
      }
    },
    getDefaultValue: () => '',
    parseArgs: (args) => args,
    formatArgs: (args) => (!args || args.length === 0 ? '' : JSON.stringify(args[0]))
  }
};

export function getDecorator(name) {
  return decorators[name] || null;
}

export function hasDecorator(name) {
  return name in decorators;
}

export function getDecoratorNames() {
  return Object.keys(decorators);
}

export function getAllDecorators() {
  return { ...decorators };
}

export function validateWithDecorator(value, decorator) {
  const def = getDecorator(decorator.type);
  if (!def) return { isValid: true };
  return def.validate(value, decorator.args);
}

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

  return { isValid: errors.length === 0, errors };
}

export function getDefaultValueForDecorators(decoratorList) {
  if (!decoratorList || decoratorList.length === 0) return '';

  for (const decorator of decoratorList) {
    const def = getDecorator(decorator.type);
    if (def) {
      const defaultValue = def.getDefaultValue(decorator.args);
      if (defaultValue !== '') return defaultValue;
    }
  }

  return '';
}

export function getVisualRenderer(decoratorList) {
  if (!decoratorList || decoratorList.length === 0) return null;

  for (const decorator of decoratorList) {
    const def = getDecorator(decorator.type);
    if (def && def.renderVisual) {
      return { render: def.renderVisual, decorator };
    }
  }

  return null;
}

export function formatDecoratorSyntax(decorator) {
  if (!decorator || !decorator.type) return '';

  const def = getDecorator(decorator.type);
  let argsStr = '';

  if (decorator.args && decorator.args.length > 0) {
    argsStr = def && def.formatArgs ? def.formatArgs(decorator.args) : decorator.args.map((arg) => JSON.stringify(arg)).join(', ');
  }

  return argsStr ? `@${decorator.type}(${argsStr})` : `@${decorator.type}`;
}

export function formatDecoratorsSyntax(decoratorList) {
  if (!decoratorList || decoratorList.length === 0) return '';
  return decoratorList.map(formatDecoratorSyntax).filter(Boolean).join(' ');
}

export default decorators;
