import React, { useState, useRef, useMemo, useCallback } from 'react';
import { IconCaretDown } from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import StyledWrapper from './StyledWrapper';

const STANDARD_METHODS = Object.freeze(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', 'TRACE', 'CONNECT']);

const KEY = Object.freeze({ ENTER: 'Enter', ESCAPE: 'Escape' });

const DEFAULT_METHOD = 'GET';

const TriggerButton = ({ method, ...props }) => {
  return (
    <button
      type="button"
      className="cursor-pointer flex items-center text-left w-full pr-4 select-none"
      {...props}
    >
      <span
        className="px-3 truncate method-span"
        id="create-new-request-method"
        title={method}
      >
        {method}
      </span>
      <IconCaretDown className="caret" size={16} strokeWidth={2} />
    </button>
  );
};

const HttpMethodSelector = ({ method = DEFAULT_METHOD, onMethodSelect }) => {
  const [isCustomMode, setIsCustomMode] = useState(false);
  const menuDropdownRef = useRef();
  const inputRef = useRef();

  const blurInput = () => inputRef.current?.blur();

  const handleInputChange = (e) => {
    const val = e.target.value.toUpperCase();
    onMethodSelect(val);
  };

  const handleMethodSelect = useCallback((verb) => {
    onMethodSelect(verb);
    setIsCustomMode(false);
    blurInput();
  }, [onMethodSelect]);

  const handleBlur = (e) => {
    // Keep the current value when blurring
    const currentValue = e.target.value ? e.target.value.toUpperCase() : method;
    onMethodSelect(currentValue);
    setIsCustomMode(false);
  };

  const handleAddCustomMethod = useCallback(() => {
    setIsCustomMode(true);
    onMethodSelect('');

    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [onMethodSelect]);

  const handleKeyDown = (e) => {
    switch (e.key) {
      case KEY.ESCAPE:
        // Keep the current value when escaping
        const currentValue = e.target.value ? e.target.value.toUpperCase() : method;
        onMethodSelect(currentValue);
        setIsCustomMode(false);
        blurInput();
        e.preventDefault();
        e.stopPropagation();
        return;
      case KEY.ENTER:
        onMethodSelect(e.target.value ? e.target.value.toUpperCase() : DEFAULT_METHOD);
        setIsCustomMode(false);
        blurInput();
        return;
      default:
        return;
    }
  };

  // Convert STANDARD_METHODS to MenuDropdown items format
  const menuItems = useMemo(() => {
    const items = STANDARD_METHODS.map((verb) => ({
      id: verb.toLowerCase(),
      label: verb,
      onClick: () => handleMethodSelect(verb)
    }));

    // Add "Add Custom" item
    items.push({
      id: 'add-custom',
      label: '+ Add Custom',
      onClick: handleAddCustomMethod,
      className: 'font-normal mt-1 text-link'
    });

    return items;
  }, [handleMethodSelect, handleAddCustomMethod]);

  // Determine selected item ID (only if method is a standard method)
  const selectedItemId = useMemo(() => {
    if (isCustomMode || !STANDARD_METHODS.includes(method)) {
      return null;
    }
    return method.toLowerCase();
  }, [method, isCustomMode]);

  // If in custom mode, render input field instead of dropdown
  if (isCustomMode) {
    return (
      <StyledWrapper>
        <div className="flex method-selector">
          <div className="flex flex-col w-full">
            <input
              ref={inputRef}
              type="text"
              className="px-2 w-full focus:bg-transparent"
              value={method}
              onChange={handleInputChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              title={method}
              autoFocus
            />
          </div>
        </div>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper>
      <div className="flex method-selector">
        <MenuDropdown
          ref={menuDropdownRef}
          items={menuItems}
          placement="bottom-start"
          selectedItemId={selectedItemId}
        >
          <TriggerButton method={method} />
        </MenuDropdown>
      </div>
    </StyledWrapper>
  );
};
export default HttpMethodSelector;
