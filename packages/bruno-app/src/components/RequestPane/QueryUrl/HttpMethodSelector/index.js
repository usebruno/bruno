import React, { useState, useRef, forwardRef } from 'react';
import { IconCaretDown } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import StyledWrapper from './StyledWrapper';

const STANDARD_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', 'TRACE', 'CONNECT'];

const HttpMethodSelector = ({ method = 'GET', onMethodSelect }) => {
  const [inputValue, setInputValue] = useState(method || 'GET');
  const dropdownTippyRef = useRef();
  const inputRef = useRef();

  const handleInputChange = (e) => {
    const val = e.target.value.toUpperCase();
    setInputValue(val);
    if (val) {
      onMethodSelect(val);
    }
  };

  const handleDropdownSelect = (verb) => {
    setInputValue(verb);
    onMethodSelect(verb || 'GET');
    dropdownTippyRef.current?.hide();
    inputRef.current?.focus();
  };

  const handleBlur = () => {
    if (!inputValue) {
      setInputValue('GET');
      onMethodSelect('GET');
    }
  };

  const Icon = forwardRef(function IconComponent(props, ref) {
    return (
      <div ref={ref} className="flex items-center pr-4 select-none uppercase">
        <button
          type="button"
          tabIndex={-1}
          aria-label="Show HTTP methods"
          className="bg-transparent border-0 p-0 cursor-pointer flex items-center"
          onClick={(e) => {
            e.stopPropagation();
            dropdownTippyRef.current?.show();
          }}
        >
          <IconCaretDown className="caret ml-1" size={16} strokeWidth={2} />
        </button>
      </div>
    );
  });

  const Verb = ({ verb }) => (
    <div
      className="dropdown-item"
      style={{
        maxWidth: 100
      }}
      onClick={() => handleDropdownSelect(verb)}
      tabIndex={0}
      aria-label={`Select HTTP method ${verb}`}
      title={verb}
    >
      {verb}
    </div>
  );

  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  return (
    <StyledWrapper>
      <div className="flex items-center method-selector">
        <input
          ref={inputRef}
          type="text"
          className="font-medium bg-transparent border-none outline-none uppercase p-2 truncate"
          value={inputValue}
          aria-label="HTTP method"
          spellCheck={false}
          autoCorrect="off"
          maxLength={20}
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          onChange={handleInputChange}
          onBlur={handleBlur}
          title={inputValue}
        />
        <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement="" transparent>
          <div className="">
            {STANDARD_METHODS.map((verb) => (
              <Verb key={verb} verb={verb} />
            ))}
          </div>
        </Dropdown>
      </div>
    </StyledWrapper>
  );
};

export default HttpMethodSelector;
