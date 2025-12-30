import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  /* Main container */
  .theme-menu {
    min-width: 200px;
    height: 325px;
    padding: 8px;
    background: ${(props) => props.theme.dropdown.bg};
    border-radius: 6px;
    box-shadow: 0px 1px 4px 0px #0000000D;
    outline: none;

    &.two-columns {
      min-width: 400px;
    }
  }

  /* Mode section */
  .mode-section {
    padding: 0 8px 12px 8px;
    margin: 0 -8px;
    border-bottom: 1px solid ${(props) => props.theme.dropdown.separator};
  }

  .mode-label {
    font-size: 12px;
    color: ${(props) => props.theme.dropdown.mutedText};
    margin-bottom: 8px;
  }

  .mode-buttons {
    display: flex;
    gap: 10px;
  }

  .mode-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 8px 4px;
    border: 1px solid ${(props) => props.theme.dropdown.separator};
    border-radius: 4px;
    background: transparent;
    color: ${(props) => props.theme.dropdown.mutedText};
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: ${(props) => props.theme.dropdown.hoverBg};
      color: ${(props) => props.theme.dropdown.color};
    }

    &.focused {
      background: ${(props) => props.theme.dropdown.hoverBg};
      color: ${(props) => props.theme.dropdown.color};
      outline: none;
    }

    &.active {
      background: ${(props) => rgba(props.theme.dropdown.selectedColor, 0.08)};
      border-color: ${(props) => props.theme.dropdown.selectedColor};
      color: ${(props) => props.theme.dropdown.selectedColor};

      &.focused {
        background: ${(props) => rgba(props.theme.dropdown.selectedColor, 0.15)};
        outline: none;
      }
    }
  }

  /* Theme lists container */
  .theme-lists {
    display: flex;
    gap: 24px;

    &.two-columns {
      gap: 0;

      .theme-list {
        flex: 1;
        padding: 8px 0;

        &:first-child {
          padding-right: 12px;
          border-right: 1px solid ${(props) => props.theme.dropdown.separator};
        }

        &:last-child {
          padding-left: 12px;
        }
      }
    }
  }

  /* Individual theme list */
  .theme-list {
    min-width: 180px;
    padding-top: 8px;
  }

  .theme-list-label {
    font-size: 12px;
    color: ${(props) => props.theme.dropdown.mutedText};
    margin-bottom: 8px;
  }

  /* Theme item */
  .theme-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 26px;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    outline: none;
    color: ${(props) => props.theme.dropdown.color};
    font-size: ${(props) => props.theme.font.size.sm};

    &:hover,
    &.focused {
      background: ${(props) => props.theme.dropdown.hoverBg};
    }

    &.active {
      color: ${(props) => props.theme.dropdown.selectedColor};
      background: ${(props) => rgba(props.theme.dropdown.selectedColor, 0.08)};

      &.focused {
        background: ${(props) => rgba(props.theme.dropdown.selectedColor, 0.15)};
      }
    }
  }

  .theme-item-label {
    flex: 1;
    white-space: nowrap;
  }

  .check-icon {
    flex-shrink: 0;
    margin-left: 12px;
    color: ${(props) => props.theme.dropdown.selectedColor};
  }
`;

export default StyledWrapper;
