import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  position: relative;

  .decorated-input-container {
    flex: 1;
    min-width: 0;
    position: relative;

    /* Error state - red background with opacity */
    &.has-error {
      .CodeMirror,
      .choices-dropdown,
      input,
      textarea {
        background-color: rgba(220, 53, 69, 0.08);
      }
    }

    /* Warning state - yellow background with opacity */
    &.has-warning {
      .CodeMirror,
      input,
      textarea {
        background-color: rgba(240, 173, 78, 0.08);
      }
    }
  }

  /* Decorator Badge/Pill - shows active decorator type */
  .decorator-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: 6px;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.15s ease;
    border: 1px solid transparent;

    background: ${(props) => props.theme.colors?.text?.green || '#28a745'}15;
    color: ${(props) => props.theme.colors?.text?.green || '#28a745'};
    border-color: ${(props) => props.theme.colors?.text?.green || '#28a745'}30;

    &:hover {
      background: ${(props) => props.theme.colors?.text?.green || '#28a745'}25;
      border-color: ${(props) => props.theme.colors?.text?.green || '#28a745'}50;
    }

    &.has-error {
      background: ${(props) => props.theme.colors?.text?.danger || '#dc3545'}15;
      color: ${(props) => props.theme.colors?.text?.danger || '#dc3545'};
      border-color: ${(props) => props.theme.colors?.text?.danger || '#dc3545'}30;

      &:hover {
        background: ${(props) => props.theme.colors?.text?.danger || '#dc3545'}25;
        border-color: ${(props) => props.theme.colors?.text?.danger || '#dc3545'}50;
      }
    }

    .badge-icon {
      font-size: 10px;
      opacity: 0.7;
    }

    .badge-text {
      max-width: 80px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .badge-dropdown-icon {
      font-size: 8px;
      opacity: 0.6;
      margin-left: 2px;
    }
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

  .choices-trigger {
    display: flex;
    align-items: center;
    width: 100%;
    height: 30px;
    padding: 0;
    background: transparent;
    color: inherit;
    font-size: ${(props) => props.theme.font?.size?.base || '13px'};
    font-family: Inter, sans-serif;
    cursor: pointer;
    line-height: 30px;

    .choices-value {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .choices-chevron {
      flex-shrink: 0;
      opacity: 0.5;
      margin-left: 4px;
    }

    &:hover .choices-chevron {
      opacity: 0.8;
    }

    &.error {
      color: ${(props) => props.theme.colors?.text?.danger || '#dc3545'};
    }
  }

  .choices-menu {
    min-width: 120px;
    max-height: 200px;
    overflow-y: auto;
  }

  /* Decorator Autocomplete Dropdown */
  .decorator-autocomplete {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 1000;
    margin-top: 2px;
    background: ${(props) => props.theme.dropdown?.bg || props.theme.sidebar.bg};
    border: 1px solid ${(props) => props.theme.dropdown?.border || props.theme.input.border};
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    max-height: 200px;
    overflow-y: auto;

    .autocomplete-header {
      padding: 6px 10px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: ${(props) => props.theme.table.thead.color};
      opacity: 0.6;
      border-bottom: 1px solid ${(props) => props.theme.dropdown?.border || props.theme.input.border};
    }

    .autocomplete-item {
      padding: 8px 12px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 2px;
      transition: background 0.1s ease;

      &:hover,
      &.selected {
        background: ${(props) => props.theme.dropdown?.hoverBg || props.theme.sidebar.bg};
      }

      .item-name {
        font-size: 12px;
        font-weight: 500;
        color: ${(props) => props.theme.text};

        .at-symbol {
          color: ${(props) => props.theme.colors?.text?.green || '#28a745'};
        }
      }

      .item-description {
        font-size: 10px;
        color: ${(props) => props.theme.table.thead.color};
        opacity: 0.7;
      }

      .item-syntax {
        font-size: 10px;
        font-family: monospace;
        color: ${(props) => props.theme.table.thead.color};
        opacity: 0.5;
        margin-top: 2px;
      }
    }

    .autocomplete-empty {
      padding: 12px;
      text-align: center;
      font-size: 11px;
      color: ${(props) => props.theme.table.thead.color};
      opacity: 0.6;
    }
  }

  .decorator-warning {
    display: flex;
    align-items: center;
    margin-left: 4px;
    color: ${(props) => props.theme.colors?.text?.yellow || '#f0ad4e'};
    font-size: 12px;
    cursor: help;
  }

  .value-error {
    display: none; /* Hidden - using badge and background instead */
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
