import styled from 'styled-components';

const StyledWrapper = styled.div`
  .mode-trigger {
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 2px 4px;
    background: transparent;
    border: none;
    border-radius: ${(props) => props.theme.border.radius.sm};
    color: ${(props) => props.theme.colors.text.muted};
    font-size: 10px;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;

    &:hover:not(:disabled) {
      color: ${(props) => props.theme.colors.text.primary};
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .mode-icon {
      color: ${(props) => props.theme.brand};
      opacity: 0.8;
    }

    .chevron {
      opacity: 0.4;
      margin-left: -2px;
    }
  }

  /* Style the dropdown menu items */
  + div [role="menu"] {
    .dropdown-item {
      padding: 4px 8px;
      font-size: 11px;

      .dropdown-icon {
        width: 12px;
        height: 12px;
      }
    }
  }
`;

export default StyledWrapper;
