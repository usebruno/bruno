import React from 'react';
import StyledWrapper from './StyledWrapper';

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
const InputWrapper = ({ label, description, error, htmlFor, required, size = 'md', className, labelId, descriptionId, errorId, children }) => {
  return (
    <StyledWrapper className={className} $size={size}>
      {label && (
        <label id={labelId} className="input-wrapper-label" htmlFor={htmlFor}>
          {label}
          {required && <span className="input-wrapper-required">*</span>}
        </label>
      )}
      {description && <div id={descriptionId} className="input-wrapper-description">{description}</div>}
      {children}
      {error && <div id={errorId} className="input-wrapper-error">{error}</div>}
    </StyledWrapper>
  );
};

export default InputWrapper;
