import styled from 'styled-components';
import { rgba } from 'polished';

const Wrapper = styled.div`
  min-width: 160px;
  font-size: ${(props) => props.theme.font.size.sm};
  color: ${(props) => props.theme.dropdown.color};
  background-color: ${(props) => props.theme.dropdown.bg};
  ${(props) =>
    props.theme.dropdown.shadow && props.theme.dropdown.shadow !== 'none'
      ? `box-shadow: ${props.theme.dropdown.shadow};`
      : ''}
  border-radius: ${(props) => props.theme.border.radius.base};
  ${(props) =>
    props.theme.dropdown.border && props.theme.dropdown.border !== 'none'
      ? `border: 1px solid ${props.theme.dropdown.border};`
      : ''}
  max-height: 90vh;
  overflow-y: auto;
  max-width: unset !important;
  padding: 0.25rem;

  [role="menu"] {
    outline: none;
    &:focus {
      outline: none;
    }
    &:focus-visible {
      outline: none;
    }
  }

  .label-item {
    display: flex;
    align-items: center;
    padding: 0.375rem 0.625rem 0.25rem 0.625rem;
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.025em;
    color: ${(props) => props.theme.dropdown.color};
    opacity: 0.6;
    margin-top: 0.25rem;
    &:first-child {
      margin-top: 0;
    }
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.275rem 0.625rem;
    cursor: pointer;
    border-radius: 6px;
    margin: 0.0625rem 0;
    font-size: ${(props) => props.theme.font.size.sm};

    &.active {
      color: ${(props) => props.theme.colors.text.yellow} !important;
      .dropdown-icon {
        color: ${(props) => props.theme.colors.text.yellow} !important;
      }
    }

    .dropdown-label {
      flex: 1;
    }

    .dropdown-icon {
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${(props) => props.theme.dropdown.iconColor};
      opacity: 0.8;
    }

    .dropdown-right-section {
      margin-left: auto;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    &:hover:not(:disabled):not(.disabled) {
      background-color: ${(props) => props.theme.dropdown.hoverBg};
    }

    &.selected-focused:not(:disabled):not(.disabled) {
      background-color: ${(props) => props.theme.dropdown.hoverBg};
    }

    &:focus-visible:not(:disabled):not(.disabled) {
      outline: none;
      background-color: ${(props) => props.theme.dropdown.hoverBg};
    }

    &:focus:not(:focus-visible) {
      outline: none;
    }

    &:disabled,
    &.disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    &.delete-item {
      color: ${(props) => props.theme.colors.text.danger};
      .dropdown-icon {
        color: ${(props) => props.theme.colors.text.danger};
      }
      &:hover {
        background-color: ${({ theme }) => {
          const hex = theme.colors.text.danger.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          return `rgba(${r}, ${g}, ${b}, 0.04)`; // 4% opacity
        }} !important;

        color: ${(props) => props.theme.colors.text.danger} !important;
      }
    }

    &.border-top {
      border-top: solid 1px ${(props) => props.theme.dropdown.separator};
      margin-top: 0.25rem;
      padding-top: 0.375rem;
    }

    &.dropdown-item-select {
      padding-left: 1.5rem;
    }

    /* Focused state - applied during keyboard navigation */
    &.dropdown-item-focused {
      background-color: ${({ theme }) => theme.dropdown.hoverBg};
      outline: none;
    }

    /* Active/selected state - applied to the currently selected item */
    &.dropdown-item-active {
      color: ${({ theme }) => theme.dropdown.selectedColor} !important;
      background-color: ${({ theme }) => rgba(theme.dropdown.selectedColor, 0.07)} !important;
      .dropdown-icon {
        color: ${({ theme }) => theme.dropdown.selectedColor} !important;
      }

      &:hover {
        color: ${({ theme }) => theme.dropdown.selectedColor} !important;
        background-color: ${({ theme }) => rgba(theme.dropdown.selectedColor, 0.07)} !important;
      }
    }

    /* Combined state - when active item is also focused */
    &.dropdown-item-active.dropdown-item-focused {
      background-color: ${({ theme }) => rgba(theme.dropdown.selectedColor, 0.07)} !important;
    }

    /* Focus visible for accessibility */
    &:focus-visible {
      outline: 2px solid ${({ theme }) => theme.dropdown.focusRing};
      outline-offset: -2px;
    }
  }

  .dropdown-separator {
    height: 1px;
    background-color: ${(props) => props.theme.dropdown.separator};
    margin: 0.25rem 0;
  }

  .submenu-trigger {
    position: relative;
  }

  .submenu-arrow {
    color: ${(props) => props.theme.dropdown.mutedText};
    flex-shrink: 0;
    display: flex;
    align-items: center;
    margin-left: auto;
  }
`;

export default Wrapper;
