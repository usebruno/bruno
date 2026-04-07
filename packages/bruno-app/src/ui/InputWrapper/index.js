import React from 'react';
import StyledWrapper from './StyledWrapper';

/**
 * Input size definitions - shared across TextInput, MaskedInput, Select
 *
 * sm: compact inputs for inline/auth contexts
 * md: default form inputs (matches .textbox)
 */
export const INPUT_SIZES = {
  sm: {
    padding: '0.15rem 0.4rem',
    fontSize: 'xs',
    borderRadius: 'sm',
    labelFontSize: 'xs'
  },
  md: {
    padding: '0.45rem',
    fontSize: 'sm',
    borderRadius: 'base',
    labelFontSize: 'sm'
  }
};

/**
 * InputWrapper - Shared form field wrapper for label, description, error
 *
 * Used internally by TextInput, Select, MaskedInput, and other form components.
 *
 * @param {string|ReactNode} props.label - Label above the input
 * @param {string|ReactNode} props.description - Description text below the label
 * @param {string} props.error - Error message below the input
 * @param {string} props.htmlFor - Links label to input id
 * @param {boolean} props.required - Shows asterisk on label
 * @param {string} props.size - Input size: 'sm' | 'md' (default: 'md')
 * @param {string} props.className - Additional CSS class
 * @param {ReactNode} props.children - The actual input element
 */
const InputWrapper = ({ label, description, error, htmlFor, required, size = 'md', className, children }) => {
  return (
    <StyledWrapper className={className} $size={size}>
      {label && (
        <label className="input-wrapper-label" htmlFor={htmlFor}>
          {label}
          {required && <span className="input-wrapper-required">*</span>}
        </label>
      )}
      {description && <div className="input-wrapper-description">{description}</div>}
      {children}
      {error && <div className="input-wrapper-error">{error}</div>}
    </StyledWrapper>
  );
};

export default InputWrapper;
