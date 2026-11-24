import styled from 'styled-components';

const StyledWrapper = styled.div`
  width: 20rem;
  max-width: calc(100vw - 1.875rem);
  box-sizing: border-box;
  padding: 0.5rem;
  color: ${(props) => props.theme.dropdown.color};
  font-size: ${(props) => props.theme.font.size.base};
  line-height: 1.25rem;

  .var-set-header {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 0.375rem;
    margin-bottom: 0.375rem;
  }

  .var-set-value {
    flex: 1;
    min-width: 0;
    font-weight: 500;
    color: ${(props) => props.theme.dropdown.color};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .var-set-name-field {
    position: relative;
    display: flex;
    align-items: center;
  }

  .var-set-copy-button {
    position: absolute;
    right: 0.375rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: transparent;
    border: none;
    border-radius: ${(props) => props.theme.border.radius.base};
    padding: 0.125rem;
    color: ${(props) => props.theme.dropdown.mutedText};
    cursor: pointer;

    &:hover:not(:disabled) {
      color: ${(props) => props.theme.dropdown.color};
      background: ${(props) => props.theme.dropdown.hoverBg};
    }

    &:disabled {
      opacity: 0.4;
      cursor: default;
    }
  }

  .var-set-copy-button.is-copied {
    color: ${(props) => props.theme.colors.text.green};
  }


  .var-scope-badge .var-add-to-option-icon {
    width: auto;
    height: auto;
    background: transparent;
    color: currentColor;
  }

  .var-set-name-input {
    width: 100%;
    box-sizing: border-box;
    background: ${(props) => props.theme.dropdown.hoverBg};
    border: 1px solid ${(props) => props.theme.border.border2};
    border-radius: ${(props) => props.theme.border.radius.base};
    padding: 0.375rem 1.5rem 0.375rem 0.5rem;
    min-height: 1.75rem;
    font-size: ${(props) => props.theme.font.size.base};
    line-height: 1.25rem;
    color: ${(props) => props.theme.dropdown.color};
    outline: none;
    transition: border-color 0.15s, background-color 0.15s;

    &:focus {
      border-color: ${(props) => props.theme.input.focusBorder};
      background: ${(props) => props.theme.input.bg};
    }

    &::placeholder {
      color: ${(props) => props.theme.dropdown.mutedText};
    }
  }

  .var-set-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .var-set-add-to-toggle {
    max-width: max-content;

    &:hover {
      background: ${(props) => props.theme.dropdown.hoverBg};
    }
  }

  .var-set-add-to-chevron {
    color: ${(props) => props.theme.dropdown.mutedText};
    transition: transform 0.15s;
  }

  .var-set-add-to-chevron.is-open {
    transform: rotate(180deg);
  }

  .var-set-error {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.danger};
    margin-top: 0.25rem;
  }

  .var-set-warning {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.warning};
    margin-top: 0.25rem;
  }

  .var-set-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.625rem;
  }
`;

export default StyledWrapper;
