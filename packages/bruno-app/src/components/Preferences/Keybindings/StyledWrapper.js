import styled from 'styled-components';

const StyledWrapper = styled.div`
  min-height: 0;
  max-height: calc(100% - 30px);

  max-width: 80%;

  display: flex;
  flex-direction: column;

  &::-webkit-scrollbar {
    display: none;
  }
  scrollbar-width: none;
  -ms-overflow-style: none;

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0px;
  }

  .section-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .section-actions-divider {
    width: 1px;
    height: 18px;
    background: ${(props) => props.theme.input.border};
    opacity: 0.9;
  }

  .section-divider {
    height: 1px;
    background: ${(props) => props.theme.input.border};
  }

  .tables-container {
    overflow-y: auto;

    &::-webkit-scrollbar {
      width: 0;
      height: 0;
    }
    scrollbar-width: none;
    -ms-overflow-style: none;

    &.tables-disabled {
      opacity: 0.45;
      pointer-events: none;
      user-select: none;
    }
  }

  .table-container {
    min-height: 0;
    overflow: hidden;
    border-radius: ${(props) => props.theme.border.radius.base};
    border: solid 1px ${(props) => props.theme.border.border0};
  }

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: ${(props) => props.theme.font.size.base};
  }

  thead {
    color: ${(props) => props.theme.table.thead.color} !important;
    background: ${(props) => props.theme.sidebar.bg};
    user-select: none;

    td {
      padding: 5px 10px !important;
      border: none !important;
      border-bottom: solid 1px ${(props) => props.theme.border.border0} !important;
      vertical-align: middle;
    }
  }

  thead td:first-child,
  tbody td:first-child {
    width: 35%;
  }

  thead td:last-child,
  tbody td:last-child {
    width: 45%;
  }

  tbody {
    tr {
      transition: background 0.1s ease;
      height: 30px;
      td {
        padding: 0px 10px !important;
        border: none !important;
        vertical-align: middle;
        background: transparent;
        transition: background 0.15s ease;
      }
    }

    tr:hover:not(.row-editing) td {
      background: ${(props) => props.theme.tabs.secondary.active.bg};
      cursor: pointer;
    }

    tr.row-editing td {
      cursor: default;
    }

    tr.section-heading-row td {
      font-weight: 700;
      padding: 6px 10px !important;
      user-select: none;
    }

    tr.section-heading-row:hover td {
      background: transparent;
      cursor: default;
    }

    tr.section-last-row td {
      border-bottom: none !important;
    }

    tr.section-spacer-row {
      height: 8px;
      pointer-events: none;
    }

    tr.section-spacer-row td {
      padding: 0 !important;
      height: 8px;
      line-height: 8px;
      font-size: 0;
      background: transparent !important;
      border: none !important;
      border-bottom: solid 1px ${(props) => props.theme.border.border0} !important;
    }

    tr.section-spacer-row:hover td {
      background: transparent !important;
      cursor: default;
    }
  }

  .keybinding-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .keybinding-row .edit-btn,
  .keybinding-row .reset-btn {
    flex-shrink: 0;
  }

  .button-placeholder {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .keybinding-row:hover .edit-btn {
    opacity: 0.9;
  }

  .shortcut-wrap {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 260px;
    flex: 1;
  }

  .shortcut-input {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 24px;
    min-width: 200px;
    max-width: 200px;
    flex-shrink: 0;
    outline: none;
    cursor: pointer;
  }

  .shortcut-input--editing {
    outline: 1px solid #E4AE49;
    border-radius: 4px;
    min-width: 100%;
    max-width: 100%;
    padding: 0 8px;
    caret-color: ${(props) => props.theme.text};
  }

  .shortcut-input--error.shortcut-input--editing {
    outline: 1px solid #CE4F3B;
    min-width: 100%;
    max-width: 100%;
  }

  .shortcut-input--readonly {
    cursor: default;
  }

  .shortcut-text {
    font-size: 12px;
    color: ${(props) => props.theme.table.input.color};
  }

  .shortcut-pills {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .shortcut-separator {
    color: ${(props) => props.theme.table.thead.color};
    margin: 0 4px;
    font-size: 12px;
  }

  .keycap {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 2px;
    border-radius: 3px;
    border: 1px solid ${(props) => props.theme.input.border};
    background: ${(props) => props.theme.background.base};
    color: ${(props) => props.theme.table.input.color};
    font-size: 10px;
    font-weight: 500;
    line-height: 1;
  }

  tbody tr.row-success td,
  tbody tr.row-success:hover td {
    background: #2E8A540F !important;
  }

  tbody tr.row-error td,
  tbody tr.row-error:hover td {
    background: #D32F2F0F !important;
  }

  .success-icon {
    color: #2E8A54;
    display: inline-flex;
    align-items: center;
  }

  .error-icon {
    color: #CE4F3B;
    display: inline-flex;
    align-items: center;
  }

  .input-error-icon {
    color: #CE4F3B;
    display: inline-flex;
    align-items: center;
    margin-left: auto;
    flex-shrink: 0;
  }

  @keyframes blink-caret {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  .editing-caret {
    display: inline-block;
    width: 1px;
    height: 12px;
    background: ${(props) => props.theme.text};
    margin-left: 1px;
    vertical-align: middle;
    animation: blink-caret 1s step-end infinite;
  }

  .edit-btn {
    background: transparent;
    border: none;
    color: ${(props) => props.theme.table.thead.color};
    padding: 0;
    cursor: pointer;
    opacity: 0.6;

    &:hover {
      opacity: 1;
    }
  }

  .reset-btn {
    background: transparent;
    border: 1px solid ${(props) => props.theme.input.border};
    color: ${(props) => props.theme.table.thead.color};
    border-radius: 6px;
    padding: 0px 6px;
    cursor: pointer;

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }

  .action-btn {
    background: transparent;
    color: ${(props) => props.theme.table.thead.color};
    border-radius: 6px;
    padding: 4px;
    cursor: pointer;
  }

  .pencil-icon {
    color: ${(props) => props.theme.table.thead.color};
    display: inline-flex;
    align-items: center;
    opacity: 0.5;
  }

  .shortcut-input--error {
    opacity: 1;
  }

  .tooltip-mod.tooltip-mod--error {
    color: ${(props) => props.theme.status.danger.text} !important;
  }

  .empty-state {
    padding: 12px 2px;
    color: ${(props) => props.theme.text};
    opacity: 0.8;
  }
`;

export default StyledWrapper;
