import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;

  .table-scroll-area {
    flex: 1 1 0%;
    min-height: 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    overflow: hidden;
  }

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
    height: auto !important;
    flex: 0 1 auto !important;
    min-height: 0 !important;
    max-height: 100% !important;
    overflow-y: auto !important;
    position: relative !important;

    min-width: 0;
    width: 100%;
    border-radius: 8px;
    border: solid 1px ${(props) => props.theme.border.border0};
  }

  .table-container [data-viewport-type='element'] {
    height: auto !important;
    position: relative !important;
    top: auto !important;
    width: 100% !important;

    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    min-height: 0;
    box-sizing: border-box;
  }

  .table-container [data-viewport-type='element'] > table {
    flex: 0 0 auto;
    width: 100%;
    align-self: stretch;
  }

  table {
    width: 100%;
    height: max-content;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 12px;

    tbody tr:not([aria-hidden='true']) td {
      height: 1px;
    }

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
          vertical-align: top;
          border-bottom: solid 1px ${(props) => props.theme.border.border0};
          border-right: solid 1px ${(props) => props.theme.border.border0};

          &:first-child {
            vertical-align: middle;
          }

          &:last-child {
            border-right: none;
            vertical-align: middle;
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
