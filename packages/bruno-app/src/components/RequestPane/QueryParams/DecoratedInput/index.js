import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import MultiLineEditor from 'components/MultiLineEditor';
import Dropdown from 'components/Dropdown';
import { IconDotsVertical, IconCheck } from '@tabler/icons';
import { useTheme } from 'providers/Theme';
import {
  detectAndParseDecorator,
  getVisualRenderer,
  validateWithDecorators,
  formatDecoratorsSyntax,
  getDefaultValueForDecorators,
  hasDecorator
} from 'utils/decorators';
import StyledWrapper from './StyledWrapper';

/**
 * DecoratedInput component that supports three modes:
 * - Visual: Custom component from decorator registry (e.g., dropdown for @choices)
 * - Value: Regular text input for editing the value
 * - Decorator: Text input for editing the raw decorator syntax
 *
 * The visual component is determined by the decorator registry.
 * To add new decorator types with custom visuals, update the registry.
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
  const hasDecoratorsProp = decorators && decorators.length > 0;

  // Mode state: 'visual' | 'value' | 'decorator'
  // Default to 'visual' if has decorators, otherwise 'value'
  const [mode, setMode] = useState(hasDecoratorsProp ? 'visual' : 'value');

  // Track previous hasDecorators to detect when decorators are first added
  const prevHasDecorators = useRef(hasDecoratorsProp);

  // Auto-switch to visual mode when decorators are first added
  useEffect(() => {
    if (hasDecoratorsProp && !prevHasDecorators.current) {
      setMode('visual');
    }
    prevHasDecorators.current = hasDecoratorsProp;
  }, [hasDecoratorsProp]);

  // Warning state for invalid decorator syntax
  const [decoratorWarning, setDecoratorWarning] = useState(null);

  // Dropdown instance ref for programmatic control
  const dropdownRef = useRef(null);

  // Live detection state - shows preview while typing (before blur)
  const liveDetection = useMemo(() => {
    if (hasDecoratorsProp) return null;
    if (!value || !value.trim().startsWith('@')) return null;
    return detectAndParseDecorator(value);
  }, [value, hasDecoratorsProp]);

  // Get visual renderer from registry (e.g., dropdown for @choices)
  const visualRenderer = useMemo(
    () => getVisualRenderer(decorators),
    [decorators]
  );

  // Validate current value against decorators using registry
  const validation = useMemo(
    () => validateWithDecorators(value, decorators),
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
      if (onBlur && !hasDecoratorsProp) {
        onBlur(blurValue || value);
      }
    },
    [onBlur, hasDecoratorsProp, value]
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
        // Check if this is a known decorator type
        if (!hasDecorator(result.decorator.type)) {
          setDecoratorWarning(`Unknown decorator: @${result.decorator.type}`);
          return;
        }
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

  // Render the default value editor (used in value mode or when no visual renderer)
  const renderValueEditor = (additionalProps = {}) => (
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
      {...additionalProps}
    />
  );

  // Render based on mode
  const renderInput = () => {
    // If no decorators, always show value mode with blur detection
    if (!hasDecoratorsProp) {
      return renderValueEditor({ onBlur: handleInputBlur });
    }

    switch (mode) {
      case 'visual':
        // Visual mode: Use renderer from registry if available
        if (visualRenderer) {
          const { render: VisualComponent, decorator } = visualRenderer;
          return (
            <VisualComponent
              value={value}
              args={decorator.args}
              onChange={handleValueChange}
              isValid={validation.isValid}
              onSave={onSave}
              onRun={onRun}
            />
          );
        }
        // Fall through to value mode if no visual renderer
        return renderValueEditor();

      case 'value':
        // Value mode: Show the actual value
        return renderValueEditor();

      case 'decorator':
        // Decorator mode: Show raw decorator syntax
        return (
          <MultiLineEditor
            value={formatDecoratorsSyntax(decorators) || ''}
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
    if (!hasDecoratorsProp) return null;

    // Determine visual mode label based on renderer
    const visualLabel = visualRenderer ? 'Select from options' : 'Visual mode';

    const modeOptions = [
      { key: 'visual', label: visualLabel, icon: '▼' },
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
      // Check if it's a known decorator
      const isKnown = hasDecorator(liveDetection.decorator.type);
      // Valid decorator detected - show preview
      return (
        <span
          className={`live-detection ${isKnown ? 'valid' : 'warning'}`}
          title={
            isKnown
              ? `Will set to: ${liveDetection.defaultValue || '(empty)'}`
              : `Unknown decorator: @${liveDetection.decorator.type}`
          }
        >
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
