import React, { useState, useCallback, useMemo, useEffect, useRef, forwardRef } from 'react';
import MultiLineEditor from 'components/MultiLineEditor';
import Dropdown from 'components/Dropdown';
import { IconChevronDown, IconCheck } from '@tabler/icons';
import { useTheme } from 'providers/Theme';
import {
  detectAndParseDecorator,
  getVisualRenderer,
  validateWithDecorators,
  formatDecoratorsSyntax,
  hasDecorator,
  getAllDecorators
} from 'utils/decorators';
import StyledWrapper from './StyledWrapper';

const BadgeIcon = forwardRef(({ decoratorType, isValid, errors }, ref) => {
  const hasErrors = !isValid && errors && errors.length > 0;
  const errorText = hasErrors ? errors.join(', ') : '';

  return (
    <div
      ref={ref}
      className={`decorator-badge ${!isValid ? 'has-error' : ''}`}
      title={hasErrors ? errorText : `@${decoratorType}`}
    >
      <span className="badge-text">@{decoratorType}</span>
      <IconChevronDown size={10} className="badge-dropdown-icon" />
    </div>
  );
});

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

  const [mode, setMode] = useState(hasDecoratorsProp ? 'visual' : 'value');
  const prevHasDecorators = useRef(hasDecoratorsProp);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteIndex, setAutocompleteIndex] = useState(0);
  const [decoratorWarning, setDecoratorWarning] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (hasDecoratorsProp && !prevHasDecorators.current) {
      setMode('visual');
    }
    prevHasDecorators.current = hasDecoratorsProp;
  }, [hasDecoratorsProp]);

  const isTypingDecorator = useMemo(() => {
    if (hasDecoratorsProp) return false;
    return value && value.trim().startsWith('@');
  }, [value, hasDecoratorsProp]);

  useEffect(() => {
    if (isTypingDecorator && !hasDecoratorsProp) {
      setShowAutocomplete(true);
      setAutocompleteIndex(0);
    } else {
      setShowAutocomplete(false);
    }
  }, [isTypingDecorator, hasDecoratorsProp]);

  const availableDecorators = useMemo(() => {
    const all = getAllDecorators();
    return Object.values(all).map((d) => ({
      name: d.name,
      description: d.description,
      syntax: d.name === 'choices' ? '@choices("opt1", "opt2")' : `@${d.name}`
    }));
  }, []);

  const filteredDecorators = useMemo(() => {
    if (!isTypingDecorator) return availableDecorators;
    const typed = value.trim().slice(1).toLowerCase();
    if (!typed) return availableDecorators;
    return availableDecorators.filter((d) => d.name.toLowerCase().startsWith(typed));
  }, [isTypingDecorator, value, availableDecorators]);

  const liveDetection = useMemo(() => {
    if (hasDecoratorsProp) return null;
    if (!value || !value.trim().startsWith('@')) return null;
    return detectAndParseDecorator(value);
  }, [value, hasDecoratorsProp]);

  const visualRenderer = useMemo(() => getVisualRenderer(decorators), [decorators]);
  const validation = useMemo(() => validateWithDecorators(value, decorators), [value, decorators]);
  const primaryDecoratorType = useMemo(() => {
    if (!decorators || decorators.length === 0) return null;
    return decorators[0].type;
  }, [decorators]);

  const handleValueChange = useCallback((newValue) => onChange(newValue), [onChange]);

  const handleInputBlur = useCallback(
    (blurValue) => {
      setShowAutocomplete(false);
      if (onBlur && !hasDecoratorsProp) {
        onBlur(blurValue || value);
      }
    },
    [onBlur, hasDecoratorsProp, value]
  );

  const handleDecoratorBlur = useCallback(
    (newSyntax) => {
      const result = detectAndParseDecorator(newSyntax);

      if (result.warning) {
        setDecoratorWarning(result.warning);
        return;
      }

      setDecoratorWarning(null);

      if (result.isDecorator && result.decorator) {
        if (!hasDecorator(result.decorator.type)) {
          setDecoratorWarning(`Unknown decorator: @${result.decorator.type}`);
          return;
        }
        onDecoratorChange([result.decorator], result.defaultValue);
        setMode('visual');
      } else {
        onDecoratorChange([], newSyntax);
        setMode('value');
      }
    },
    [onDecoratorChange]
  );

  const handleAutocompleteSelect = useCallback(
    (decorator) => {
      setShowAutocomplete(false);
      onChange(decorator.syntax);
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (!showAutocomplete || filteredDecorators.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAutocompleteIndex((prev) => (prev + 1) % filteredDecorators.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAutocompleteIndex((prev) => (prev - 1 + filteredDecorators.length) % filteredDecorators.length);
      } else if (e.key === 'Enter' && showAutocomplete) {
        e.preventDefault();
        handleAutocompleteSelect(filteredDecorators[autocompleteIndex]);
      } else if (e.key === 'Escape') {
        setShowAutocomplete(false);
      }
    },
    [showAutocomplete, filteredDecorators, autocompleteIndex, handleAutocompleteSelect]
  );

  const handleModeSelect = useCallback((newMode) => {
    setMode(newMode);
    if (dropdownRef.current) {
      dropdownRef.current.hide();
    }
  }, []);

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

  const renderAutocomplete = () => {
    if (!showAutocomplete) return null;

    return (
      <div className="decorator-autocomplete">
        <div className="autocomplete-header">Decorators</div>
        {filteredDecorators.length === 0 ? (
          <div className="autocomplete-empty">No matching decorators</div>
        ) : (
          filteredDecorators.map((decorator, index) => (
            <div
              key={decorator.name}
              className={`autocomplete-item ${index === autocompleteIndex ? 'selected' : ''}`}
              onClick={() => handleAutocompleteSelect(decorator)}
              onMouseEnter={() => setAutocompleteIndex(index)}
            >
              <div className="item-name">
                <span className="at-symbol">@</span>
                {decorator.name}
              </div>
              <div className="item-description">{decorator.description}</div>
              <div className="item-syntax">{decorator.syntax}</div>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderInput = () => {
    if (!hasDecoratorsProp) {
      return (
        <>
          {renderValueEditor({ onBlur: handleInputBlur })}
          {renderAutocomplete()}
        </>
      );
    }

    switch (mode) {
      case 'visual':
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
        return renderValueEditor();

      case 'value':
        return renderValueEditor();

      case 'decorator':
        return (
          <MultiLineEditor
            value={formatDecoratorsSyntax(decorators) || ''}
            theme={storedTheme}
            onSave={onSave}
            onChange={() => {}}
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

  const renderDecoratorBadge = () => {
    if (!hasDecoratorsProp) return null;

    const modeOptions = [
      { key: 'visual', label: visualRenderer ? 'Select from options' : 'Visual mode', icon: '▼' },
      { key: 'value', label: 'Edit value', icon: 'Aa' },
      { key: 'decorator', label: 'Edit decorator', icon: '@' }
    ];

    return (
      <Dropdown
        onCreate={(instance) => (dropdownRef.current = instance)}
        icon={(
          <BadgeIcon
            decoratorType={primaryDecoratorType}
            isValid={validation.isValid}
            errors={validation.errors}
          />
        )}
        placement="bottom-end"
        appendTo={() => document.body}
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

  const renderLiveDetectionPreview = () => {
    if (!liveDetection || showAutocomplete) return null;

    if (liveDetection.isDecorator && liveDetection.decorator) {
      const isKnown = hasDecorator(liveDetection.decorator.type);
      return (
        <span
          className={`live-detection ${isKnown ? 'valid' : 'warning'}`}
          title={isKnown ? `Will set to: ${liveDetection.defaultValue || '(empty)'}` : `Unknown decorator`}
        >
          @{liveDetection.decorator.type}
        </span>
      );
    }

    if (liveDetection.warning) {
      return (
        <span className="live-detection warning" title={liveDetection.warning}>
          @?
        </span>
      );
    }

    return null;
  };

  const containerClasses = useMemo(() => {
    const classes = ['decorated-input-container'];
    if (hasDecoratorsProp && !validation.isValid) classes.push('has-error');
    if (decoratorWarning) classes.push('has-warning');
    return classes.join(' ');
  }, [hasDecoratorsProp, validation.isValid, decoratorWarning]);

  return (
    <StyledWrapper onKeyDown={handleKeyDown}>
      <div className={containerClasses}>{renderInput()}</div>
      {renderLiveDetectionPreview()}
      {renderDecoratorBadge()}
      {decoratorWarning && (
        <span className="decorator-warning" title={decoratorWarning}>
          ⚠
        </span>
      )}
    </StyledWrapper>
  );
};

export default DecoratedInput;
