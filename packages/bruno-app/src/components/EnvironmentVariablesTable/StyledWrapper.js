import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;

  &.is-resizing {
    cursor: col-resize !important;
    user-select: none;
  }

  .table-container {
    overflow-y: auto;
    border-radius: 8px;
    border: solid 1px ${(props) => props.theme.border.border0};
  }

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 12px;

    td {
      vertical-align: middle;
      padding: 2px 10px;

      &:nth-child(1) {
        width: 25px;
        border-right: none;
      }
      &:nth-child(4) {
        width: 80px;
      }
      &:nth-child(5) {
        width: 60px;
      }
    }

    thead {
      color: ${(props) => props.theme.table.thead.color} !important;
      background: ${(props) => props.theme.sidebar.bg};
      font-size: ${(props) => props.theme.font.size.base};
      user-select: none;

      td {
        padding: 5px 10px !important;
        border-bottom: solid 1px ${(props) => props.theme.border.border0};
        border-right: solid 1px ${(props) => props.theme.border.border0};
        position: relative;

        &:last-child {
          border-right: none;
        }

        .resize-handle {
          position: absolute;
          right: 0;
          top: 0;
          width: 4px;
          cursor: col-resize;
          background: transparent;
          z-index: 100;

          &:hover,
          &.resizing {
            background: ${(props) => props.theme.colors.accent};
          }
        }
      }
    }

    tbody {
      tr {
        transition: background 0.1s ease;

        &:last-child td {
          border-bottom: none;
        }

        td {
          border-bottom: solid 1px ${(props) => props.theme.border.border0};
          border-right: solid 1px ${(props) => props.theme.border.border0};

          &:last-child {
            border-right: none;
          }
        }
      }
    }
  }

  .tooltip-mod {
    max-width: 200px !important;
  }

  input[type='text'] {
    width: 100%;
    border: 1px solid transparent;
    outline: none !important;
    background-color: transparent;
    color: ${(props) => props.theme.text};
    padding: 0;
    border-radius: 4px;
    transition: all 0.15s ease;

    &:focus {
      outline: none !important;
    }
  }

  input[type='checkbox'] {
    cursor: pointer;
    width: 14px;
    height: 14px;
    accent-color: ${(props) => props.theme.colors.accent};
    vertical-align: middle;
    margin: 0;
  }

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    color: ${(props) => props.theme.colors.text.muted};
    background: transparent;
    border: none;
    cursor: pointer;
    border-radius: 4px;
    transition: color 0.15s ease, background 0.15s ease;
  }

  .button-container {
    padding: 12px 2px;
    background: ${(props) => props.theme.bg};
    flex-shrink: 0;
    display: flex;
    gap: 8px;
  }

  .submit {
    padding: 6px 16px;
    font-size: ${(props) => props.theme.font.size.sm};
    border-radius: ${(props) => props.theme.border.radius.base};
    border: none;
    background: ${(props) => props.theme.brand};
    color: ${(props) => props.theme.bg};
    cursor: pointer;
    transition: opacity 0.15s ease;

    &:hover {
      opacity: 0.9;
    }
  }

  .reset {
    background: transparent;
    padding: 6px 16px;
    color: ${(props) => props.theme.brand};
    &:hover {
      opacity: 0.9;
    }
  }
`;

export default Wrapper;
