import React, { useState, useRef, useCallback, forwardRef, useMemo } from 'react';
import styled from 'styled-components';
import Dropdown from 'components/Dropdown';
import { IconChevronDown, IconX } from '@tabler/icons';
import { getAllTypes, getType } from 'utils/decorators';

const TriggerWrapper = styled.div`
  .type-trigger {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    background: transparent;
    border: 1px solid transparent;
    color: ${(props) => props.theme.table.input.color};

    &:hover {
      background: ${(props) => props.theme.dropdown.hoverBg};
    }

    &.has-type {
      color: ${(props) => props.theme.primary.solid};
    }

    .type-chevron {
      opacity: 0.5;
    }
  }
`;

const DropdownContent = styled.div`
  width: 320px;
  padding: 12px;

  .form-group {
    margin-bottom: 12px;

    &:last-of-type {
      margin-bottom: 0;
    }
  }

  .form-row {
    display: flex;
    gap: 12px;

    .form-group {
      flex: 1;
      margin-bottom: 0;
    }
  }

  .toggle-row {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;

    .toggle-label {
      font-size: 13px;
      color: ${(props) => props.theme.text};
    }

    .toggle-switch {
      position: relative;
      width: 36px;
      height: 20px;
      background: ${(props) => props.theme.input.border};
      border-radius: 20px;
      transition: background 0.2s ease;

      &::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 16px;
        height: 16px;
        background: white;
        border-radius: 50%;
        transition: transform 0.2s ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }

      &.active {
        background: ${(props) => props.theme.primary.solid};

        &::after {
          transform: translateX(16px);
        }
      }
    }

    input[type="checkbox"] {
      display: none;
    }
  }

  .checkbox-row {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 12px;
    color: ${(props) => props.theme.text};

    input[type="checkbox"] {
      width: 16px;
      height: 16px;
      cursor: pointer;
    }
  }

  .form-label {
    display: block;
    font-size: 11px;
    font-weight: 500;
    color: ${(props) => props.theme.table.thead.color};
    margin-bottom: 6px;
  }

  .form-select {
    width: 100%;
    padding: 8px 10px;
    font-size: 13px;
    background: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: 4px;
    color: ${(props) => props.theme.table.input.color};
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;

    &:focus {
      outline: none;
      border-color: ${(props) => props.theme.input.focusBorder};
    }
  }

  .form-input {
    width: 100%;
    padding: 8px 10px;
    font-size: 12px;
    background: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: 4px;
    color: ${(props) => props.theme.table.input.color};

    &:focus {
      outline: none;
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    &::placeholder {
      opacity: 0.5;
    }
  }

  .chips-input-container {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    padding: 8px;
    background: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: 4px;
    min-height: 42px;
    cursor: text;

    &:focus-within {
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: ${(props) => props.theme.dropdown.hoverBg};
      border-radius: 16px;
      font-size: 12px;
      color: ${(props) => props.theme.text};
      max-width: 150px;

      .chip-text {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .chip-remove {
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: ${(props) => props.theme.table.thead.color};
        opacity: 0.7;
        flex-shrink: 0;

        &:hover {
          opacity: 1;
          color: ${(props) => props.theme.colors.text.danger};
        }
      }
    }

    .chips-input {
      flex: 1;
      min-width: 80px;
      border: none;
      background: transparent;
      font-size: 12px;
      color: ${(props) => props.theme.table.input.color};
      outline: none;
      padding: 4px 0;

      &::placeholder {
        opacity: 0.5;
      }
    }
  }

`;

const TypeTrigger = forwardRef(({ decorators }, ref) => {
  const mainDecorator = decorators?.find((d) => d.type !== 'required');
  const hasRequired = decorators?.some((d) => d.type === 'required');
  const hasType = mainDecorator && mainDecorator.type !== 'string';

  const getLabel = () => {
    if (mainDecorator) {
      const type = getType(mainDecorator.type);
      return type ? type.label : mainDecorator.type.charAt(0).toUpperCase() + mainDecorator.type.slice(1);
    }
    return 'String';
  };

  return (
    <TriggerWrapper>
      <div ref={ref} className={`type-trigger ${hasType || hasRequired ? 'has-type' : ''}`}>
        <span className="type-label">{getLabel()}{hasRequired ? '*' : ''}</span>
        <IconChevronDown size={12} strokeWidth={1.5} className="type-chevron" />
      </div>
    </TriggerWrapper>
  );
});

const TypeSelector = ({ decorators, value, onDecoratorChange }) => {
  const dropdownRef = useRef(null);
  const chipsInputRef = useRef(null);

  // Get all available types
  const allTypes = useMemo(() => getAllTypes(), []);
  const typeOptions = useMemo(() => Object.values(allTypes), [allTypes]);

  // Find the main type decorator (not required)
  const mainDecorator = decorators?.find((d) => d.type !== 'required');
  const hasRequired = decorators?.some((d) => d.type === 'required');

  // State for selected type
  const [selectedType, setSelectedType] = useState(() => {
    return mainDecorator?.type || 'string';
  });

  // State for required toggle
  const [isRequired, setIsRequired] = useState(hasRequired || false);

  // State for type-specific args (stored as object)
  const [typeArgs, setTypeArgs] = useState(() => {
    if (mainDecorator?.args) {
      return mainDecorator.args;
    }
    return {};
  });

  // State for chips input
  const [newChip, setNewChip] = useState('');

  // Get current type definition
  const currentType = useMemo(() => getType(selectedType), [selectedType]);

  // Handle type change
  const handleTypeChange = useCallback((e) => {
    const newType = e.target.value;
    setSelectedType(newType);
    // Reset args when type changes
    setTypeArgs({});
    setNewChip('');
  }, []);

  // Handle arg change for text/number fields
  const handleArgChange = useCallback((key, value) => {
    setTypeArgs((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Handle checkbox arg change
  const handleCheckboxArgChange = useCallback((key, checked) => {
    setTypeArgs((prev) => ({ ...prev, [key]: checked }));
  }, []);

  // Handle chips add
  const handleAddChip = useCallback((key) => {
    if (newChip.trim()) {
      setTypeArgs((prev) => ({
        ...prev,
        [key]: [...(prev[key] || []), newChip.trim()]
      }));
      setNewChip('');
    }
  }, [newChip]);

  // Handle chips remove
  const handleRemoveChip = useCallback((key, index) => {
    setTypeArgs((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((_, i) => i !== index)
    }));
  }, []);

  // Handle chips keydown
  const handleChipsKeyDown = useCallback((e, key) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddChip(key);
    } else if (e.key === 'Backspace' && !newChip) {
      const chips = typeArgs[key] || [];
      if (chips.length > 0) {
        e.preventDefault();
        handleRemoveChip(key, chips.length - 1);
      }
    }
  }, [handleAddChip, handleRemoveChip, newChip, typeArgs]);

  // Handle apply
  const handleApply = useCallback(() => {
    const newDecorators = [];
    let newValue = value;

    // Add the main type decorator (skip if string with no args)
    const hasArgs = Object.keys(typeArgs).some((key) => {
      const val = typeArgs[key];
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === 'boolean') return val;
      return val !== undefined && val !== '';
    });

    if (selectedType !== 'string' || hasArgs) {
      newDecorators.push({ type: selectedType, args: typeArgs });

      // Set default value for choices
      if (selectedType === 'choices' && typeArgs.options?.length > 0) {
        if (!typeArgs.options.includes(value)) {
          newValue = typeArgs.options[0];
        }
      }

      // Set default value for boolean
      if (selectedType === 'boolean' && value !== 'true' && value !== 'false') {
        newValue = 'true';
      }
    }

    // Add required decorator if checked
    if (isRequired) {
      newDecorators.push({ type: 'required', args: {} });
    }

    onDecoratorChange(newDecorators, newValue);

    if (dropdownRef.current) {
      dropdownRef.current.hide();
    }
  }, [selectedType, typeArgs, value, isRequired, onDecoratorChange]);

  // Render form field based on field definition
  const renderFormField = (field) => {
    const fieldValue = typeArgs[field.key];

    switch (field.type) {
      case 'text':
        return (
          <div key={field.key} className="form-group">
            <label className="form-label">{field.label}</label>
            <input
              type="text"
              value={fieldValue || ''}
              onChange={(e) => handleArgChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="form-input"
            />
          </div>
        );

      case 'number':
        return (
          <div key={field.key} className="form-group">
            <label className="form-label">{field.label}</label>
            <input
              type="number"
              value={fieldValue || ''}
              onChange={(e) => handleArgChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="form-input"
            />
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.key} className="form-group">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={fieldValue || false}
                onChange={(e) => handleCheckboxArgChange(field.key, e.target.checked)}
              />
              <span>{field.label}</span>
            </label>
          </div>
        );

      case 'chips':
        const chips = fieldValue || [];
        return (
          <div key={field.key} className="form-group">
            <label className="form-label">{field.label}</label>
            <div className="chips-input-container" onClick={() => chipsInputRef.current?.focus()}>
              {chips.map((chip, index) => (
                <span key={index} className="chip">
                  <span className="chip-text">{chip}</span>
                  <IconX
                    size={12}
                    strokeWidth={2}
                    className="chip-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveChip(field.key, index);
                    }}
                  />
                </span>
              ))}
              <input
                ref={chipsInputRef}
                type="text"
                value={newChip}
                onChange={(e) => setNewChip(e.target.value)}
                onKeyDown={(e) => handleChipsKeyDown(e, field.key)}
                placeholder={chips.length === 0 ? field.placeholder : 'Add more...'}
                className="chips-input"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Render type-specific fields
  const renderTypeFields = () => {
    if (!currentType || !currentType.formFields || currentType.formFields.length === 0) {
      return null;
    }

    // Group number fields (min/max) in a row
    const fields = currentType.formFields;
    const numberFields = fields.filter((f) => f.type === 'number');
    const otherFields = fields.filter((f) => f.type !== 'number');

    return (
      <>
        {numberFields.length >= 2 ? (
          <div className="form-row">
            {numberFields.map(renderFormField)}
          </div>
        ) : (
          numberFields.map(renderFormField)
        )}
        {otherFields.map(renderFormField)}
      </>
    );
  };

  return (
    <Dropdown
      onCreate={(ref) => (dropdownRef.current = ref)}
      icon={<TypeTrigger decorators={decorators} />}
      placement="bottom-start"
      appendTo={() => document.body}
      hideOnClick={false}
      onClickOutside={handleApply}
    >
      <DropdownContent>
        <div className="form-group">
          <label className="form-label">Type</label>
          <select
            className="form-select"
            value={selectedType}
            onChange={handleTypeChange}
          >
            {typeOptions.map((type) => (
              <option key={type.name} value={type.name}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
            />
            <span className={`toggle-switch ${isRequired ? 'active' : ''}`} />
            <span className="toggle-label">Required</span>
          </label>
        </div>

        {renderTypeFields()}
      </DropdownContent>
    </Dropdown>
  );
};

export default TypeSelector;
