import React from 'react';
import { IconSearch } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const MockSearchInput = ({ value, onChange, placeholder = 'Search', className = '', ...rest }) => (
  <StyledWrapper className={className}>
    <IconSearch size={14} stroke={1.5} aria-hidden="true" />
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck="false"
      {...rest}
    />
  </StyledWrapper>
);

export default MockSearchInput;
