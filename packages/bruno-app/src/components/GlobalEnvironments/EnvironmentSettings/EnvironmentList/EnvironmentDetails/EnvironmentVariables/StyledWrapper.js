import styled from 'styled-components';

const Wrapper = styled.div`
  table {
    width: 100%;
    border-collapse: collapse;
    font-weight: 500;
    table-layout: fixed;

    thead,
    td {
      border: 1px solid ${(props) => props.theme.collection.environment.settings.gridBorder};
      padding: 4px 10px;

      &:nth-child(1),
      &:nth-child(4) {
        width: 70px;
      }
      &:nth-child(5) {
        width: 40px;
      }

      &:nth-child(2) {
        width: 25%;
      }

      &:nth-child(3) {
        overflow: visible;
        position: relative;
      }
    }

    thead {
      color: ${(props) => props.theme.table.thead.color};
      font-size: ${(props) => props.theme.font.size.base};
      user-select: none;
    }
    thead td {
      padding: 6px 10px;
    }
  }

  .btn-add-param {
    font-size: ${(props) => props.theme.font.size.base};
  }

  .tooltip-mod {
    font-size: ${(props) => props.theme.font.size.xs} !important;
    width: 150px !important;
  }

  input[type='text'] {
    width: 100%;
    border: solid 1px transparent;
    outline: none !important;
    background-color: transparent;

    &:focus {
      outline: none !important;
      border: solid 1px transparent;
    }
  }

  input[type='checkbox'] {
    cursor: pointer;
    position: relative;
    top: 1px;
  }

  .autocomplete-wrapper {
    position: relative;
    width: 100%;

    .autocomplete-suggestions {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: ${(props) => props.theme.dropdown.bg};
      border: 1px solid ${(props) => props.theme.dropdown.border};
      border-radius: 4px;
      box-shadow: ${(props) => props.theme.dropdown.shadow};
      z-index: 1000;
      max-height: 200px;
      overflow-y: auto;
      margin-top: 2px;

      .suggestion-item {
        padding: 6px 10px;
        cursor: pointer;
        font-size: ${(props) => props.theme.font.size.base};
        color: ${(props) => props.theme.dropdown.primaryText};
        transition: background-color 0.15s ease;

        &:hover,
        &.selected {
          background-color: ${(props) => props.theme.dropdown.hoverBg};
        }
      }
    }
  }

  .value-autocomplete-wrapper {
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;

    .suggestions-toggle-btn {
      position: absolute;
      right: 4px;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 2px 6px;
      font-size: 10px;
      color: ${(props) => props.theme.text.muted};
      opacity: 0.6;
      transition: opacity 0.15s ease;
      z-index: 10;

      &:hover {
        opacity: 1;
      }
    }

    .value-autocomplete-suggestions {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: ${(props) => props.theme.dropdown.bg};
      border: 1px solid ${(props) => props.theme.dropdown.border};
      border-radius: 4px;
      box-shadow: ${(props) => props.theme.dropdown.shadow};
      z-index: 1000;
      max-height: 200px;
      overflow-y: auto;
      margin-top: 2px;

      .suggestion-item {
        display: flex;
        flex-direction: column;
        padding: 8px 10px;
        cursor: pointer;
        font-size: ${(props) => props.theme.font.size.base};
        color: ${(props) => props.theme.dropdown.primaryText};
        transition: background-color 0.15s ease;
        border-bottom: 1px solid ${(props) => props.theme.dropdown.border};

        &:last-child {
          border-bottom: none;
        }

        &:hover,
        &.selected {
          background-color: ${(props) => props.theme.dropdown.hoverBg};
        }

        .suggestion-env-name {
          font-size: ${(props) => props.theme.font.size.sm};
          color: ${(props) => props.theme.dropdown.secondaryText || props.theme.text.muted};
          margin-bottom: 2px;
        }

        .suggestion-value {
          font-family: monospace;
          word-break: break-all;
          color: ${(props) => props.theme.dropdown.primaryText};
        }
      }
    }
  }
`;

export default Wrapper;
