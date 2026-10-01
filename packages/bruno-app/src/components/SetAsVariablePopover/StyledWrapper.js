import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  min-width: 18.1875rem;
  max-width: min(40rem, calc(100vw - 1.875rem));
  box-sizing: border-box;
  padding: 0.5rem;
  color: ${(props) => props.theme.dropdown.color};
  font-size: ${(props) => props.theme.font.size.base};
  line-height: 1.25rem;

  .var-set-title {
    font-weight: 500;
    margin-bottom: 0.5rem;
  }

  .var-set-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.375rem;
  }

  .var-set-row-label {
    width: 3rem;
    flex-shrink: 0;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.dropdown.mutedText};
  }

  .var-set-input {
    flex: 1;
    min-width: 0;
    box-sizing: border-box;
    background: ${(props) => props.theme.dropdown.hoverBg};
    border: 1px solid ${(props) => props.theme.border.border2};
    border-radius: ${(props) => props.theme.border.radius.base};
    padding: 0.375rem 0.5rem;
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

  .var-set-input:read-only {
    color: ${(props) => props.theme.dropdown.mutedText};
    cursor: default;
  }

  .var-set-scope-section {
    margin-top: 0.5rem;
  }

  .var-set-scope-heading {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.dropdown.mutedText};
    margin-bottom: 0.25rem;
  }

  .var-set-scope-list {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .var-set-scope-option {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    width: 100%;
    height: 1.5rem;
    box-sizing: border-box;
    padding: 0.0625rem 0.25rem 0.0625rem 0.5rem;
    border: none;
    border-radius: ${(props) => props.theme.border.radius.base};
    background: transparent;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.dropdown.color};
    text-align: left;
    cursor: pointer;

    &:hover:not(:disabled) {
      background: ${(props) => props.theme.dropdown.hoverBg};
    }

    &:disabled {
      cursor: not-allowed;
      color: ${(props) => props.theme.dropdown.mutedText};
    }
  }

  .var-set-scope-option.is-active {
    background: ${(props) => rgba(props.theme.dropdown.selectedColor, 0.07)};
    color: ${(props) => props.theme.dropdown.selectedColor};

    &:hover {
      background: ${(props) => rgba(props.theme.dropdown.selectedColor, 0.12)};
    }
  }

  .var-set-scope-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 1.125rem;
    height: 1.125rem;
    border-radius: ${(props) => props.theme.border.radius.sm};
    line-height: 1;

    svg {
      width: 0.75rem;
      height: 0.75rem;
    }
  }

  .var-set-scope-icon-request {
    color: ${(props) => props.theme.colors.text.purple};
    background: ${(props) => rgba(props.theme.colors.text.purple, 0.14)};
  }

  .var-set-scope-icon-folder {
    color: ${(props) => props.theme.colors.text.yellow};
    background: ${(props) => rgba(props.theme.colors.text.yellow, 0.14)};
  }

  .var-set-scope-icon-collection {
    color: ${(props) => props.theme.colors.text.subtext1};
    background: ${(props) => rgba(props.theme.colors.text.subtext1, 0.14)};
  }

  .var-set-scope-icon-environment {
    color: ${(props) => props.theme.colors.text.green};
    background: ${(props) => rgba(props.theme.colors.text.green, 0.14)};
  }

  .var-set-scope-icon-global {
    color: ${(props) => props.theme.textLink};
    background: ${(props) => rgba(props.theme.textLink, 0.14)};
  }

  .var-set-scope-icon-muted {
    color: ${(props) => props.theme.dropdown.mutedText};
    background: ${(props) => rgba(props.theme.dropdown.mutedText, 0.14)};
  }

  .var-set-scope-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .var-set-note {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.dropdown.mutedText};
    flex-shrink: 0;
  }

  .var-set-hint {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.dropdown.mutedText};
    margin-top: 0.375rem;
  }

  .var-set-error {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.danger};
    margin: -0.125rem 0 0.375rem 3.5rem;
  }

  .var-set-secret-label {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin-top: 0.5rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.dropdown.color};
    cursor: pointer;
    user-select: none;
  }

  .var-set-secret-label input {
    margin: 0;
    cursor: pointer;
    accent-color: ${(props) => props.theme.primary.solid};
  }

  .var-set-footer {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }
`;

export default StyledWrapper;
