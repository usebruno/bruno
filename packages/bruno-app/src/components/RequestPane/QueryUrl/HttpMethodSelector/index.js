import React, { useState, useRef, forwardRef } from 'react';
import { IconCaretDown } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import StyledWrapper from './StyledWrapper';

const STANDARD_METHODS = Object.freeze(['GET','POST','PUT','DELETE','PATCH','OPTIONS','HEAD','TRACE','CONNECT']);

const MAX_METHOD_LENGTH = 20;

const KEY = Object.freeze({ ENTER: 'Enter', ESCAPE: 'Escape' });

const DEFAULT_METHOD = 'GET';

function Verb({ verb, onSelect }) {
  return (
    <div className="dropdown-item" onClick={() => onSelect(verb)}>
      {verb}
    </div>
  );
}

const Icon = forwardRef(function IconComponent(
  { isCustomMode, inputValue, handleInputChange, handleBlur, handleKeyDown, inputRef },
  ref
) {
  if (isCustomMode) {
    return (
      <div className="flex flex-col w-full">
        <input
          ref={inputRef}
          type="text"
          className="font-medium px-2 w-full focus:bg-transparent"
          value={inputValue}
          maxLength={MAX_METHOD_LENGTH}
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
  const [isCustomMode, setIsCustomMode] = useState(false);
  const dropdownTippyRef = useRef();
  const inputRef = useRef();
  
  const blurInput = () => inputRef.current?.blur();

  const handleInputChange = (e) => {
    const val = e.target.value.toUpperCase();
    onMethodSelect(val);
  };

  const handleDropdownSelect = (verb) => {
    onMethodSelect(verb);
    setIsCustomMode(false);
    dropdownTippyRef.current?.hide();
    blurInput();
  };

  const handleBlur = () => {
    setIsCustomMode(false);
  };

  const handleAddCustomMethod = () => {
    setIsCustomMode(true);
    onMethodSelect('');
    dropdownTippyRef.current?.hide();
    
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  const handleKeyDown = (e) => {
    switch (e.key) {
      case KEY.ESCAPE:
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

  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  return (
    <StyledWrapper>
      <div className="flex method-selector">
        <Dropdown
          onCreate={onDropdownCreate}
          icon={
            <Icon
              isCustomMode={isCustomMode}
              inputValue={method}
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
            <div className="dropdown-item font-normal mt-1" onClick={handleAddCustomMethod}>
              <span className="text-link">+ Add Custom</span>
            </div>
          </div>
        </Dropdown>
      </div>
    </StyledWrapper>
  );
};
export default HttpMethodSelector;
