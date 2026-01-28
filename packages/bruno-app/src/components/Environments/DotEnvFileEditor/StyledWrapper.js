import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;

  .raw-editor-container {
    flex: 1;
    overflow: hidden;
    border-radius: 8px;
    border: solid 1px ${(props) => props.theme.border.border0};

    .CodeMirror {
      font-size: ${(props) => props.theme.font.size.base};
    }
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

      &:first-child {
        width: 35%;
      }

      &.delete-col {
        width: 40px;
        text-align: center;
        padding: 2px 4px;
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

        &:last-child {
          border-right: none;
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

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: ${(props) => props.theme.colors.text.muted};

    svg {
      opacity: 0.4;
      margin-bottom: 12px;
    }

    .title {
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 8px;
    }

    .description {
      font-size: 12px;
      text-align: center;
      max-width: 300px;
      line-height: 1.5;
    }
  }
`;

export default StyledWrapper;
