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
    margin: 10px 0;
  }

  .tables-container {
    overflow-y: auto;
    padding-right: 2px;

    &::-webkit-scrollbar {
      width: 0;
      height: 0;
    }
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .group-block {
    margin-bottom: 20px;
  }

  .group-block:last-child {
    margin-bottom: 0;
  }

  .group-heading {
    font-size: 12px;
    color: ${(props) => props.theme.text};
    margin-bottom: 8px;
    padding-left: 2px;
    user-select: none;
  }

  .table-container {
    min-height: 0;
    overflow: hidden;
    border-radius: ${(props) => props.theme.border.radius.base};
    border-bottom: 1px solid ${(props) => props.theme.table.border};
  }

  table {
    width: 100%;
    border-spacing: 0;
    table-layout: fixed;
  }

  thead th:first-child,
  tbody td:first-child {
    width: 35%;
  }

  thead th:last-child,
  tbody td:last-child {
    width: 45%;
  }

  td {
    padding: 6px 10px;
    font-size: 12px;
    border-top: 1px solid ${(props) => props.theme.table.border};
    border-left: 1px solid ${(props) => props.theme.table.border};
    border-right: 1px solid ${(props) => props.theme.table.border};
    background: transparent;
    transition: background 0.15s ease;
  }

  tbody tr:hover td {
    background: ${(props) =>
      props.theme.table.hoverBg
      || props.theme.button.secondary.hoverBg
      || props.theme.background.highlight};
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

  .shortcut-input--readonly {
    cursor: default;
  }

  .shortcut-text {
    font-family: monospace;
    color: ${(props) => props.theme.table.input.color};
  }

  .keycap {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 20px;
    padding: 0 6px;
    border-radius: 4px;
    border: 1px solid ${(props) => props.theme.input.border};
    background: ${(props) => props.theme.background.base};
    color: ${(props) => props.theme.table.input.color};
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    font-weight: 500;
    line-height: 1;
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
    border: none;
    color: ${(props) => props.theme.table.thead.color};
    border-radius: 8px;
    padding: 0px;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
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
