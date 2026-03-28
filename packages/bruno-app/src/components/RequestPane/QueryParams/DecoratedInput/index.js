import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import MultiLineEditor from 'components/MultiLineEditor';
import { useTheme } from 'providers/Theme';
import { getVisualRenderer, validateWithDecorators } from 'utils/decorators';
import StyledWrapper from './StyledWrapper';

const DecoratedInput = ({
  value,
  decorators,
  onChange,
  onDecoratorChange,
  onSave,
  onRun,
  collection,
  item,
  placeholder = ''
}) => {
  const { storedTheme } = useTheme();
  const hasDecorators = decorators && decorators.length > 0;

  const visualRenderer = useMemo(() => getVisualRenderer(decorators), [decorators]);
  const validation = useMemo(() => validateWithDecorators(value, decorators), [value, decorators]);

  const handleValueChange = useCallback((newValue) => onChange(newValue), [onChange]);

  const renderInput = () => {
    // If we have a visual renderer (like choices dropdown), use it
    if (hasDecorators && visualRenderer) {
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

    // Default: regular text input
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
  };

  const containerClasses = useMemo(() => {
    const classes = ['decorated-input-container'];
    if (hasDecorators && !validation.isValid) classes.push('has-error');
    return classes.join(' ');
  }, [hasDecorators, validation.isValid]);

  return (
    <StyledWrapper>
      <div className={containerClasses}>{renderInput()}</div>
    </StyledWrapper>
  );
};

export default DecoratedInput;
