import React from 'react';
import { IconSearch, IconX } from '@tabler/icons';

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
    <div className={`relative px-2 ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <span className="text-gray-500 sm:text-sm">
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
        className="block w-full pl-7 py-2 sm:text-sm rounded-md"
        value={searchText}
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
    </div>
  );
};

export default SearchInput;
