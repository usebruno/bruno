import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import MultiLineEditor from 'components/MultiLineEditor';
import Dropdown from 'components/Dropdown';
import { IconDotsVertical, IconCheck } from '@tabler/icons';
import { useTheme } from 'providers/Theme';
import {
  formatDecoratorsToSyntax,
  detectAndParseDecorator,
  validateValueAgainstDecorators,
  getDecoratorChoices
} from 'utils/decorators';
import StyledWrapper from './StyledWrapper';

/**
 * DecoratedInput component that supports three modes:
 * - Visual: Dropdown for @choices decorator
 * - Value: Regular text input for editing the value
 * - Decorator: Text input for editing the raw decorator syntax
 */
const DecoratedInput = ({
  value,
  decorators,
  onChange,
  onBlur,
  onDecoratorChange,
  onSave,
  onRun,
  collection,
  item,
  placeholder = ''
}) => {
  const { storedTheme } = useTheme();
  const hasDecorators = decorators && decorators.length > 0;

  // Mode state: 'visual' | 'value' | 'decorator'
  // Default to 'visual' if has decorators, otherwise 'value'
  const [mode, setMode] = useState(hasDecorators ? 'visual' : 'value');

  // Track previous hasDecorators to detect when decorators are first added
  const prevHasDecorators = useRef(hasDecorators);

  // Auto-switch to visual mode when decorators are first added
  useEffect(() => {
    if (hasDecorators && !prevHasDecorators.current) {
      setMode('visual');
    }
    prevHasDecorators.current = hasDecorators;
  }, [hasDecorators]);

  // Warning state for invalid decorator syntax
  const [decoratorWarning, setDecoratorWarning] = useState(null);

  // Dropdown instance ref for programmatic control
  const dropdownRef = useRef(null);

  // Live detection state - shows preview while typing (before blur)
  const liveDetection = useMemo(() => {
    if (hasDecorators) return null;
    if (!value || !value.trim().startsWith('@')) return null;
    return detectAndParseDecorator(value);
  }, [value, hasDecorators]);

  // Get choices from decorator if present
  const choices = useMemo(() => getDecoratorChoices(decorators), [decorators]);

  // Validate current value against decorators
  const validation = useMemo(
    () => validateValueAgainstDecorators(value, decorators),
    [value, decorators]
  );

  // Handle value change from any input mode
  const handleValueChange = useCallback(
    (newValue) => {
      onChange(newValue);
    },
    [onChange]
  );

  // Handle blur - trigger decorator detection for non-decorated inputs
  const handleInputBlur = useCallback(
    (blurValue) => {
      if (onBlur && !hasDecorators) {
        onBlur(blurValue || value);
      }
    },
    [onBlur, hasDecorators, value]
  );

  // Handle decorator syntax change (on blur from decorator mode)
  const handleDecoratorBlur = useCallback(
    (newSyntax) => {
      const result = detectAndParseDecorator(newSyntax);

      if (result.warning) {
        setDecoratorWarning(result.warning);
        return;
      }

      setDecoratorWarning(null);

      if (result.isDecorator && result.decorator) {
        // Valid decorator - update decorators and set default value together
        onDecoratorChange([result.decorator], result.defaultValue);
        setMode('visual');
      } else {
        // Not a decorator - clear decorators and set value
        onDecoratorChange([], newSyntax);
        setMode('value');
      }
    },
    [onDecoratorChange]
  );

  // Handle dropdown selection in visual mode
  const handleChoiceSelect = useCallback(
    (e) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  // Render based on mode
  const renderInput = () => {
    // If no decorators, always show value mode with blur detection
    if (!hasDecorators) {
      return (
        <MultiLineEditor
          value={value || ''}
          theme={storedTheme}
          onSave={onSave}
          onChange={handleValueChange}
          onBlur={handleInputBlur}
          onRun={onRun}
          collection={collection}
          item={item}
          variablesAutocomplete={true}
          placeholder={placeholder || 'Value'}
        />
      );
    }

    switch (mode) {
      case 'visual':
        // Visual mode: Show dropdown for choices
        if (choices && choices.length > 0) {
          return (
            <select
              className={`choices-dropdown ${!validation.isValid ? 'error' : ''}`}
              value={value || ''}
              onChange={handleChoiceSelect}
            >
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
        }
        // Fall through to value mode if no choices
        return (
          <MultiLineEditor
            value={value || ''}
            theme={storedTheme}
            onSave={onSave}
            onChange={handleValueChange}
            onRun={onRun}
            collection={collection}
            item={item}
            variablesAutocomplete={true}
            placeholder={placeholder || 'Value'}
          />
        );

      case 'value':
        // Value mode: Show the actual value
        return (
          <MultiLineEditor
            value={value || ''}
            theme={storedTheme}
            onSave={onSave}
            onChange={handleValueChange}
            onRun={onRun}
            collection={collection}
            item={item}
            variablesAutocomplete={true}
            placeholder={placeholder || 'Value'}
          />
        );

      case 'decorator':
        // Decorator mode: Show raw decorator syntax
        return (
          <MultiLineEditor
            value={formatDecoratorsToSyntax(decorators) || ''}
            theme={storedTheme}
            onSave={onSave}
            onChange={() => {}} // Don't update on every keystroke
            onBlur={(e) => handleDecoratorBlur(e.target?.value || e)}
            onRun={onRun}
            collection={collection}
            item={item}
            variablesAutocomplete={false}
            placeholder='@choices("option1", "option2")'
          />
        );

      default:
        return null;
    }
  };

  // Handle mode selection
  const handleModeSelect = useCallback((newMode) => {
    setMode(newMode);
    // Hide dropdown after selection
    if (dropdownRef.current) {
      dropdownRef.current.hide();
    }
  }, []);

  // Render mode selector only if has decorators
  const renderModeSelector = () => {
    if (!hasDecorators) return null;

    const modeOptions = [
      { key: 'visual', label: 'Select from options', icon: '▼' },
      { key: 'value', label: 'Edit value', icon: 'Aa' },
      { key: 'decorator', label: 'Edit decorator', icon: '@' }
    ];

    return (
      <Dropdown
        onCreate={(instance) => (dropdownRef.current = instance)}
        icon={(
          <button type="button" className="mode-menu-trigger" title="Change edit mode">
            <IconDotsVertical size={14} strokeWidth={1.5} />
          </button>
        )}
        placement="bottom-end"
      >
        <div className="mode-dropdown-menu">
          {modeOptions.map((option) => (
            <div
              key={option.key}
              className={`dropdown-item ${mode === option.key ? 'dropdown-item-active' : ''}`}
              onClick={() => handleModeSelect(option.key)}
            >
              <span className="dropdown-icon">{option.icon}</span>
              <span className="dropdown-label">{option.label}</span>
              {mode === option.key && (
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

  // Render live detection preview (shows while typing a decorator)
  const renderLiveDetectionPreview = () => {
    if (!liveDetection) return null;

    if (liveDetection.isDecorator && liveDetection.decorator) {
      // Valid decorator detected - show preview
      return (
        <span className="live-detection valid" title={`Will set to: ${liveDetection.defaultValue || '(empty)'}`}>
          @{liveDetection.decorator.type}
        </span>
      );
    }

    if (liveDetection.warning) {
      // Invalid syntax - show warning
      return (
        <span className="live-detection warning" title={liveDetection.warning}>
          @?
        </span>
      );
    }

    return null;
  };

  return (
    <StyledWrapper>
      <div className="decorated-input-container">{renderInput()}</div>
      {renderLiveDetectionPreview()}
      {renderModeSelector()}
      {decoratorWarning && <span className="decorator-warning" title={decoratorWarning}>!</span>}
      {!validation.isValid && mode === 'visual' && (
        <span className="value-error" title={validation.errors.join(', ')}>!</span>
      )}
    </StyledWrapper>
  );
};

export default DecoratedInput;
