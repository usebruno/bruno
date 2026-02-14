import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  width: 100%;

  .decorated-input-container {
    flex: 1;
    min-width: 0;
  }

  .mode-menu-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    margin-left: 4px;
    padding: 0;
    border: none;
    background: transparent;
    color: ${(props) => props.theme.table.thead.color};
    cursor: pointer;
    border-radius: 3px;
    opacity: 0.6;
    transition: all 0.15s ease;
    flex-shrink: 0;

    &:hover {
      opacity: 1;
      background: ${(props) => props.theme.dropdown?.hoverBg || props.theme.sidebar.bg};
    }
  }

  .mode-dropdown-menu {
    min-width: 160px;
  }

  .choices-dropdown {
    width: 100%;
    padding: 4px 0;
    border: 1px solid transparent;
    border-radius: 3px;
    background: inherit;
    color: inherit;
    font-size: inherit;
    font-family: inherit;
    cursor: pointer;
    outline: none;
    text-align: left;

    &:focus {
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    &.error {
      border-color: ${(props) => props.theme.colors?.text?.danger || '#dc3545'};
    }
  }

  .decorator-warning {
    display: flex;
    align-items: center;
    margin-left: 4px;
    color: ${(props) => props.theme.colors?.text?.yellow || '#f0ad4e'};
    font-size: 12px;
  }

  .value-error {
    display: flex;
    align-items: center;
    margin-left: 4px;
    color: ${(props) => props.theme.colors?.text?.danger || '#dc3545'};
    font-size: 12px;
  }

  .live-detection {
    display: flex;
    align-items: center;
    margin-left: 6px;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 500;
    flex-shrink: 0;
    cursor: default;

    &.valid {
      background: ${(props) => props.theme.colors?.text?.green || '#28a745'}22;
      color: ${(props) => props.theme.colors?.text?.green || '#28a745'};
      border: 1px solid ${(props) => props.theme.colors?.text?.green || '#28a745'}44;
    }

    &.warning {
      background: ${(props) => props.theme.colors?.text?.yellow || '#f0ad4e'}22;
      color: ${(props) => props.theme.colors?.text?.yellow || '#f0ad4e'};
      border: 1px solid ${(props) => props.theme.colors?.text?.yellow || '#f0ad4e'}44;
    }
  }
`;

export default Wrapper;
