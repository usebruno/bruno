import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  position: relative;
  display: inline-flex;

  .filter-trigger {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    font-size: ${(props) => props.theme.font.size.sm};
    border: 1px solid ${(props) => props.theme.table.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: transparent;
    color: inherit;
    cursor: pointer;
    white-space: nowrap;
    transition: border-color 0.15s;

    &:hover {
      border-color: ${(props) => rgba(props.theme.dropdown.selectedColor || '#666', 0.5)};
    }

    &.active {
      border-color: ${(props) => props.theme.dropdown.selectedColor};
      color: ${(props) => props.theme.dropdown.selectedColor};
    }

    .filter-chevron {
      transition: transform 0.15s;

      &.open {
        transform: rotate(180deg);
      }
    }
  }

  .filter-menu {
    position: absolute;
    top: calc(100% + 4px);
    z-index: 100;
    min-width: 160px;
    padding: 0.25rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.dropdown.color};
    background-color: ${(props) => props.theme.dropdown.bg};
    border-radius: ${(props) => props.theme.border.radius.base};
    ${(props) =>
      props.theme.dropdown.shadow && props.theme.dropdown.shadow !== 'none'
        ? `box-shadow: ${props.theme.dropdown.shadow};`
        : ''}
    ${(props) =>
      props.theme.dropdown.border && props.theme.dropdown.border !== 'none'
        ? `border: 1px solid ${props.theme.dropdown.border};`
        : ''}
    max-height: 300px;
    overflow-y: auto;

    &.align-left {
      left: 0;
      right: auto;
    }

    &.align-right {
      right: 0;
      left: auto;
    }
  }

  .filter-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.275rem 0.625rem;
    cursor: pointer;
    border-radius: 6px;
    margin: 0.0625rem 0;

    &:hover {
      background-color: ${(props) => props.theme.dropdown.hoverBg};
    }

    &.selected {
      color: ${(props) => props.theme.dropdown.selectedColor};
      background-color: ${(props) => rgba(props.theme.dropdown.selectedColor || '#666', 0.07)};
    }

    .filter-option-icon {
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.8;
    }

    .filter-option-label {
      flex: 1;
    }

    .filter-option-check {
      margin-left: auto;
      flex-shrink: 0;
      opacity: 0;

      &.visible {
        opacity: 1;
      }
    }
  }

  .filter-separator {
    height: 1px;
    background-color: ${(props) => props.theme.dropdown.separator};
    margin: 0.25rem 0;
  }
`;

export default StyledWrapper;
