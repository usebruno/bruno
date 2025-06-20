import React, { useState, useRef, forwardRef } from 'react';
import { IconCaretDown } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import StyledWrapper from './StyledWrapper';

const STANDARD_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
const DEFAULT_METHOD = 'GET';

function Verb({ verb, onSelect }) {
  return (
    <div className="dropdown-item" onClick={() => onSelect(verb)}>
      {verb}
    </div>
  );
}

const Icon = forwardRef(function IconComponent({
  isCustomMode,
  inputValue,
  handleInputChange,
  handleBlur,
  handleKeyDown,
  inputRef
}, ref) {
  if (isCustomMode) {
    return (
      <div className="flex flex-col w-full">
        <input
          ref={inputRef}
          type="text"
          className="font-medium px-2 w-full"
          value={inputValue}
          maxLength={20}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          title={inputValue}
          autoFocus
        />
      </div>
    );
  }
  return (
    <div ref={ref} className="flex pr-4 select-none">
      <button
        type="button"
        className="cursor-pointer flex items-center text-left w-full"
      >
        <span
          className="font-medium px-2 truncate method-span"
          id="create-new-request-method"
          title={inputValue}
        >
          {inputValue}
        </span>
        <IconCaretDown className="caret" size={16} strokeWidth={2} />
      </button>
    </div>
  );
});

const HttpMethodSelector = ({ method = DEFAULT_METHOD, onMethodSelect }) => {
  const [inputValue, setInputValue] = useState(method || DEFAULT_METHOD);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const dropdownTippyRef = useRef();
  const inputRef = useRef();

  const handleInputChange = (e) => {
    const val = e.target.value.toUpperCase();
    setInputValue(val);
    if (val) onMethodSelect(val);
  };

  const handleDropdownSelect = (verb) => {
    setInputValue(verb);
    onMethodSelect(verb || DEFAULT_METHOD);
    setIsCustomMode(false);
    dropdownTippyRef.current?.hide();
    inputRef.current?.blur();
  };

  const handleBlur = () => {
    if (!inputValue) {
      setInputValue(DEFAULT_METHOD);
      onMethodSelect(DEFAULT_METHOD);
    } 
    setIsCustomMode(false);
  };

  const handleAddCustomMethod = () => {
    setIsCustomMode(true);
    setInputValue('');
    dropdownTippyRef.current?.hide();
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setInputValue(method || DEFAULT_METHOD);
      setIsCustomMode(false);
      inputRef.current?.blur();
      e.preventDefault();
      e.stopPropagation();
    } else if (e.key === 'Enter') {
      if (!inputValue) {
        setInputValue(method || DEFAULT_METHOD);
        onMethodSelect(method || DEFAULT_METHOD);
      } else {
        onMethodSelect(inputValue);
      }
      setIsCustomMode(false);
      inputRef.current?.blur();
    }
  };

  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  return (
    <StyledWrapper>
      <div className="flex method-selector">
        <Dropdown
          onCreate={onDropdownCreate}
          icon={
            <Icon
              isCustomMode={isCustomMode}
              inputValue={inputValue}
              handleInputChange={handleInputChange}
              handleBlur={handleBlur}
              handleKeyDown={handleKeyDown}
              inputRef={inputRef}
            />
          }
          placement="bottom-start"
        >
          <div>
            {STANDARD_METHODS.map((verb) => (
              <Verb key={verb} verb={verb} onSelect={handleDropdownSelect} />
            ))}
            <div
              className="dropdown-item font-normal mt-1"
              onClick={handleAddCustomMethod}
            >
              <span className="text-link">+ Add Custom</span>
            </div>
          </div>
        </Dropdown>
      </div>
    </StyledWrapper>
  );
};
export default HttpMethodSelector;
