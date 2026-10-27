import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 1.75rem;
  padding: 0.125rem 0.375rem;
  border-radius: ${(props) => props.theme.border.radius.base};

  &:has(.target-trigger:hover) {
    background: ${(props) => props.theme.dropdown.hoverBg};
  }

  &.target-selected {
    background: ${(props) => rgba(props.theme.dropdown.selectedColor, 0.07)};
  }

  &.target-selected .target-label {
    color: ${(props) => props.theme.dropdown.selectedColor};
  }

  .target-trigger {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    min-width: 0;
    padding: 0;
    border: none;
    background: transparent;
    text-align: left;
    cursor: pointer;
  }

  .target-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
    border-radius: ${(props) => props.theme.border.radius.sm};
  }

  .target-icon-global {
    color: ${(props) => props.theme.textLink};
    background: ${(props) => rgba(props.theme.textLink, 0.14)};
  }

  .target-icon-environment {
    color: ${(props) => props.theme.colors.text.green};
    background: ${(props) => rgba(props.theme.colors.text.green, 0.14)};
  }

  .target-icon-muted {
    color: ${(props) => props.theme.dropdown.mutedText};
    background: ${(props) => rgba(props.theme.dropdown.mutedText, 0.14)};
  }

  .target-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: ${(props) => props.theme.dropdown.color};
  }

  .target-note {
    flex: 1;
    white-space: nowrap;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.dropdown.mutedText};
  }

  .create-environment-link {
    padding: 0;
    border: none;
    background: transparent;
    font-size: inherit;
    color: ${(props) => props.theme.dropdown.color};
    text-decoration: underline;
    cursor: pointer;
  }

  .create-environment-link:hover {
    color: ${(props) => props.theme.textLink};
  }

  .create-environment-input {
    flex: 1;
    min-width: 0;
    height: 1.5rem;
    padding: 0 0.375rem;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.dropdown.color};
    background: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.focusBorder};
    border-radius: ${(props) => props.theme.border.radius.base};
    outline: none;
  }

  .create-environment-button {
    flex-shrink: 0;
    height: 1.5rem;
    padding: 0 0.5rem;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.dropdown.color};
    background: transparent;
    border: 1px solid ${(props) => props.theme.border.border2};
    border-radius: ${(props) => props.theme.border.radius.base};
    cursor: pointer;
  }

  .create-environment-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .create-environment-error {
    flex-basis: 100%;
    padding-left: 1.75rem;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.danger};
  }

  .create-environment-button:hover {
    background: ${(props) => props.theme.dropdown.hoverBg};
  }
`;

export default StyledWrapper;
