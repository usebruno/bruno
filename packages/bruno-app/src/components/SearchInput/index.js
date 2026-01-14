import React from 'react';
import { IconSearch, IconX } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const SearchInput = ({
  searchText,
  setSearchText,
  placeholder = 'Search',
  className = '',
  onChange,
  ...props
}) => {
  const handleChange = (e) => {
    setSearchText(e.target.value);
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <StyledWrapper className={`px-2 ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <span className="search-icon">
          <IconSearch size={16} strokeWidth={1.5} />
        </span>
      </div>
      <input
        type="text"
        name="search"
        placeholder={placeholder}
        id="search-input"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        className="block w-full pl-7 py-2 rounded-md"
        value={searchText}
        autoFocus
        onChange={handleChange}
        {...props}
      />
      {searchText !== '' && (
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
          <span
            className="close-icon"
            onClick={() => {
              setSearchText('');
            }}
          >
            <IconX size={16} strokeWidth={1.5} className="cursor-pointer" />
          </span>
        </div>
      )}
    </StyledWrapper>
  );
};

export default SearchInput;
