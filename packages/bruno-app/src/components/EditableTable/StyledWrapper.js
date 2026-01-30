import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;

  &.is-resizing {
    cursor: col-resize !important;
    user-select: none;
  }

  .table-container {
    overflow: auto;
    border-radius: ${(props) => props.theme.border.radius.base};
    border: solid 1px ${(props) => props.theme.border.border0};
  }

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: normal !important;
  }

  thead {
    color: ${(props) => props.theme.table.thead.color} !important;
    background: ${(props) => props.theme.sidebar.bg};
    user-select: none;
    overflow: visible;

    border: none !important;

    td {
      padding: 5px 10px !important;
      border-top: none !important;
      border-left: none !important;
      border-bottom: solid 1px ${(props) => props.theme.border.border0};
      border-right: solid 1px ${(props) => props.theme.border.border0};
      vertical-align: middle;
      position: relative;
      overflow: visible;

      &:last-child {
        border-right: none;
      }

      .column-name {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        padding-right: 4px;
      }

      .resize-handle {
        position: absolute;
        right: 0;
        top: 0;
        width: 4px;
        height: 100%;
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

  &.has-checkbox thead td:nth-child(1) {
    width: 25px !important;
    border-right: none;
  }

  tbody {
    tr {
      transition: background 0.1s ease;

      &:last-child td {
        border-bottom: none;
      }

      td {
        padding: 1px 10px !important;
        border-top: none !important;
        border-left: none !important;
        border-bottom: solid 1px ${(props) => props.theme.border.border0};
        border-right: solid 1px ${(props) => props.theme.border.border0};
        vertical-align: middle;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;

        &:last-child {
          border-right: none;
        }

        /* Handle CodeMirror editors overflow */
        .cm-editor {
          max-width: 100%;

          .cm-scroller {
            overflow: hidden !important;
          }

          .cm-content {
            max-width: 100%;
          }

          .cm-line {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      }
    }
  }

  &.has-checkbox tbody td:nth-child(1) {
    width: 25px;
    border-right: none;
    text-align: center;
    vertical-align: middle;
    line-height: 1;

    input[type='checkbox'] {
      vertical-align: baseline;
      display: inline-block;
    }
  }

  .tooltip-mod {
    max-width: 200px !important;
  }

  input[type='text'] {
    width: 100%;
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

    &:hover {
      color: ${(props) => props.theme.colors.text.danger};
    }
  }

  .drag-handle {
    .icon-grip,
    .icon-minus {
      color: ${(props) => props.theme.colors.text.muted};
    }
  }

  select {
    background-color: transparent;
    color: ${(props) => props.theme.text};
    border: none;
    outline: none;
    padding: 2px 8px;
    font-size: 12px;
    cursor: pointer;

    option {
      background-color: ${(props) => props.theme.bg};
      color: ${(props) => props.theme.text};
    }
  }
`;

export default StyledWrapper;
