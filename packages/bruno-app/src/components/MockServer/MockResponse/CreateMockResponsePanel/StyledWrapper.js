import styled from 'styled-components';

const StyledWrapper = styled.div`
  width: 100%;

  &.create-form {
    width: 100%;
    border: 1px solid ${(props) => props.theme.examples.border || props.theme.table.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    padding: 16px;
    margin-bottom: 16px;
    background: ${(props) => props.theme.bg};
  }

  .field-label {
    display: block;
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 500;
    color: ${(props) => props.theme.text};
    margin-bottom: 4px;
  }

  .mock-input,
  .mock-select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid ${(props) => props.theme.examples.border || props.theme.input.border};
    border-radius: 6px;
    background-color: transparent;
    color: ${(props) => props.theme.text};
    font-family: inherit;
    font-size: ${(props) => props.theme.font.size.base};
    line-height: 1.5;
    transition: all 0.2s ease;
    outline: none;
    box-shadow: none;

    &::placeholder {
      color: ${(props) => props.theme.input.placeholder.color};
      opacity: ${(props) => props.theme.input.placeholder.opacity};
    }

    &:focus {
      border-color: ${(props) => props.theme.input.focusBorder};
      outline: none;
      box-shadow: none;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .mock-input-description {
    resize: vertical;
    min-height: 64px;
  }

  .example-section {
    padding-top: 4px;
  }

  .example-toggle {
    color: ${(props) => props.theme.text};
  }

  .example-toggle input {
    accent-color: ${(props) => props.theme.colors?.text?.link || props.theme.colors?.primary};
  }

  .field-error {
    color: ${(props) => props.theme.colors?.danger || '#ef4444'};
    font-size: ${(props) => props.theme.font.size.sm};
    margin-top: 4px;
  }
`;

export default StyledWrapper;
