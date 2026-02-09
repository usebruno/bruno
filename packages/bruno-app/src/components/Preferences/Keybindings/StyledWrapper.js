import styled from 'styled-components';

const StyledWrapper = styled.div`
  /* IMPORTANT: allow a flex child to actually scroll */
  min-height: 0;

  /* If parent gives a height, this will take it.
     If not, you can set a max-height here (optional). */
  height: 100%;

  display: flex;
  flex-direction: column;

  &::-webkit-scrollbar {
    display: none;
  }
  scrollbar-width: none;
  -ms-overflow-style: none;

  .keybinding-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .shortcut-wrap {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    width: 260px;
    flex: 0 0 260px;
  }

  .shortcut-input {
    width: 100%;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    outline:none;
    text-overflow: ellipsis;
    background: transparent;

    font-family: monospace;
    color: ${(props) => props.theme.table.input.color};
    cursor: pointer;

    &:hover {
      opacity: 0.85;
    }

    &:focus {
      opacity: 1;
    }

    &::placeholder {
      opacity: 0.5;
    }
  }

  .recording-dot {
    width: 6px;
    height: 6px;
    border-radius: 100%;
    background: currentColor;
    opacity: 0.45;
  }

  .reset-btn {
    background: transparent;
    color: ${(props) => props.theme.table.thead.color};
    border-radius: 8px;
    padding: 6px 10px;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
  }

  .shortcut-error {
    margin-top: 4px;
    font-size: 11px;
    opacity: 0.75;
  }

  .shortcut-input--error {
    opacity: 1;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  /* ✅ This is THE scroll container */
  .table-container {
    flex: 1 1 auto;
    min-height: 0;         /* crucial for scrolling in flex layouts */
    max-height: 650px;
    overflow-y: auto;

    border-radius: 8px;
    border-top: 1px solid ${(props) => props.theme.table.border};
    border-bottom: 1px solid ${(props) => props.theme.table.border};

    /* hide scrollbar (works in Chromium/Electron) */
    &::-webkit-scrollbar {
      width: 0;
      height: 0;
    }
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  table {
    width: 100%;
    border-collapse: separate;
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

  /* ✅ Sticky header: only on TH, not THEAD */
  thead th {
    position: sticky;
    top: 0;
    z-index: 5;

    background: ${(props) => props.theme.background};
    color: ${(props) => props.theme.table.thead.color};
    font-size: ${(props) => props.theme.font.size.base};
    user-select: none;
    font-weight: 500;
    padding: 10px;
    text-align: left;

    border-left: 1px solid ${(props) => props.theme.table.border};
    border-right: 1px solid ${(props) => props.theme.table.border};
    border-bottom: 1px solid ${(props) => props.theme.table.border};
    box-shadow: 0 1px 0 ${(props) => props.theme.table.border};
  }

  td {
    padding: 6px 10px;
    font-size: ${(props) => props.theme.font.size.sm};
    border-top: 1px solid ${(props) => props.theme.table.border};
    border-left: 1px solid ${(props) => props.theme.table.border};
    border-right: 1px solid ${(props) => props.theme.table.border};
  }
`;

export default StyledWrapper;
