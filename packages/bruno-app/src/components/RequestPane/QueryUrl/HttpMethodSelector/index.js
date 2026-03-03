import React, { useState, useRef, useMemo, useCallback } from 'react';
import { IconCaretDown } from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import StyledWrapper from './StyledWrapper';
import { useTheme } from 'providers/Theme';

const STANDARD_METHODS = Object.freeze(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', 'TRACE', 'CONNECT']);

const KEY = Object.freeze({ ENTER: 'Enter', ESCAPE: 'Escape' });

const DEFAULT_METHOD = 'GET';

const TriggerButton = ({ method, methodSpanRef, showCaret, ...props }) => {
  return (
    <button
      type="button"
      className="cursor-pointer flex items-center gap-2 text-left w-full select-none px-2"
      {...props}
    >
      <span
        ref={methodSpanRef}
        className="truncate method-span"
        id="create-new-request-method"
        title={method}
      >
        {method}
      </span>
      {showCaret && <IconCaretDown className="caret" size={14} strokeWidth={2} />}
    </button>
  );
};

const HttpMethodSelector = ({ method = DEFAULT_METHOD, onMethodSelect, showCaret = false }) => {
  const [isCustomMode, setIsCustomMode] = useState(false);
  const inputRef = useRef();
  const selectedMethodRef = useRef(method);
  const methodSpanRef = useRef();
  const [previousMethodWidth, setPreviousMethodWidth] = useState(null);

  const { theme } = useTheme();
  const methodColor = useMemo(() => {
    const colorMap = {
      ...theme.request.methods,
      ...theme.request
    };
    return colorMap[method.toLocaleLowerCase()];
  }, [method, theme]);

  const blurInput = () => inputRef.current?.blur();

  const handleInputChange = (e) => {
    const val = e.target.value.toUpperCase();
    onMethodSelect(val);
  };

  const handleMethodSelect = useCallback((verb) => {
    onMethodSelect(verb);
    selectedMethodRef.current = verb;
    setIsCustomMode(false);
    blurInput();
  }, [onMethodSelect]);

  const handleBlur = (e) => {
    // Keep the current value when blurring
    let currentValue = '';
    if (e.target.value && e.target.value.length > 0) {
      currentValue = e.target.value.toUpperCase();
      selectedMethodRef.current = currentValue;
    } else {
      currentValue = selectedMethodRef.current;
    }
    onMethodSelect(currentValue);
    setIsCustomMode(false);
  };

  const handleAddCustomMethod = useCallback(() => {
    // Capture the width of the current method span before switching to custom mode
    if (methodSpanRef.current) {
      setPreviousMethodWidth(methodSpanRef.current.offsetWidth);
    }
    setIsCustomMode(true);
    onMethodSelect('');

    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [onMethodSelect]);

  const handleKeyDown = (e) => {
    switch (e.key) {
      case KEY.ESCAPE: {
        setIsCustomMode(false);
        blurInput();
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      case KEY.ENTER: {
        onMethodSelect(e.target.value ? e.target.value.toUpperCase() : DEFAULT_METHOD);
        setIsCustomMode(false);
        blurInput();
        return;
      }
      default: {
        return;
      }
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
    // Calculate width based on content length (in ch units), clamped to max 16ch
    // Add 1ch for cursor space
    const contentWidth = Math.min(method.length + 1, 16);
    // Use previous method width as minimum, content-based width as current
    const minWidthPx = previousMethodWidth ? `${previousMethodWidth}px` : '5ch';
    // Use calc to add padding space (px-2 = 0.5rem per side = 1rem total) to the ch width
    const currentWidth = `calc(${Math.max(contentWidth, 1)}ch + 1rem)`;

    return (
      <StyledWrapper>
        <div className="flex method-selector custom-input-mode" style={{ color: methodColor }}>
          <div className="flex flex-col w-full">
            <input
              ref={inputRef}
              type="text"
              className="px-2 focus:bg-transparent"
              style={{
                minWidth: minWidthPx,
                width: currentWidth,
                maxWidth: 'calc(16ch + 1rem)',
                fontSize: '12px'
              }}
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
      <div className="flex method-selector" style={{ color: methodColor }}>
        <MenuDropdown
          items={menuItems}
          placement="bottom-start"
          selectedItemId={selectedItemId}
          data-testid="method-selector"
        >
          <TriggerButton method={method} showCaret={showCaret} methodSpanRef={methodSpanRef} />
        </MenuDropdown>
      </div>
    </StyledWrapper>
  );
};
export default HttpMethodSelector;
