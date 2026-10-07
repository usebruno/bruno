import styled from 'styled-components';
import { rgba } from 'polished';

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

  .var-set-scope-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
    padding: 0.125rem 0.375rem;
    background: ${(props) => rgba(props.theme.brand, 0.07)};
    border: 1px solid ${(props) => rgba(props.theme.brand, 0.08)};
    border-radius: ${(props) => props.theme.border.radius.base};
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.brand};
    letter-spacing: 0.03125rem;
  }

  .var-set-scope-badge .var-set-scope-icon {
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
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    max-width: max-content;
    background: transparent;
    border: none;
    border-radius: ${(props) => props.theme.border.radius.base};
    padding: 0.25rem 0.375rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.dropdown.color};
    cursor: pointer;
    transition: background 0.15s;

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

  .var-set-secret-label {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin-left: auto;
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
    min-height: 1.5rem;
    box-sizing: border-box;
    padding: 0.0625rem 0.25rem 0.0625rem 0.5rem;
    border-radius: ${(props) => props.theme.border.radius.base};
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.dropdown.color};
  }

  .var-set-scope-option:has(.var-set-scope-trigger:hover) {
    background: ${(props) => props.theme.dropdown.hoverBg};
  }

  .var-set-scope-trigger {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    width: 100%;
    height: 1.5rem;
    min-width: 0;
    box-sizing: border-box;
    background: transparent;
    border: none;
    padding: 0;
    font-size: ${(props) => props.theme.font.size.sm};
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  .var-set-scope-option.is-active {
    background: ${(props) => rgba(props.theme.dropdown.selectedColor, 0.07)};
    color: ${(props) => props.theme.dropdown.selectedColor};

    &:has(.var-set-scope-trigger:hover) {
      background: ${(props) => rgba(props.theme.dropdown.selectedColor, 0.12)};
    }
  }

  .var-set-scope-option.is-disabled .var-set-note {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .var-set-create-env-link {
    flex-shrink: 0;
    margin-left: auto;
    background: transparent;
    border: none;
    padding: 0;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.textLink};
    text-decoration: underline;
    text-underline-offset: 0.125rem;
    cursor: pointer;
  }

  .var-set-scope-option.is-creating {
    gap: 0.25rem;
    padding: 0.125rem 0.25rem;
  }

  .var-set-create-env-input {
    flex: 1;
    min-width: 0;
    box-sizing: border-box;
    background: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.border.border2};
    border-radius: ${(props) => props.theme.border.radius.base};
    padding: 0.125rem 0.375rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.dropdown.color};
    outline: none;

    &:focus {
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    &::placeholder {
      color: ${(props) => props.theme.dropdown.mutedText};
    }
  }

  .var-set-create-env-submit {
    flex-shrink: 0;
    background: transparent;
    border: 1px solid ${(props) => props.theme.border.border2};
    border-radius: ${(props) => props.theme.border.radius.base};
    padding: 0.125rem 0.5rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.dropdown.color};
    cursor: pointer;

    &:hover:not(:disabled) {
      background: ${(props) => props.theme.dropdown.hoverBg};
    }

    &:disabled {
      cursor: default;
      color: ${(props) => props.theme.dropdown.mutedText};
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
