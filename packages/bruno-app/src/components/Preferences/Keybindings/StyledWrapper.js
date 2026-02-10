import styled from 'styled-components';

const StyledWrapper = styled.div`
  /* IMPORTANT: allow a flex child to actually scroll */
  min-height: 0;

  /* Take parent height (preferences pane), scroll happens inside table-container */
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

  /* Pencil appears subtly on row hover */
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
    /* keep width stable */
    width: 200px;
    max-width: 200px;
    flex-shrink: 0;

    /* show normal caret when editable */
    caret-color: ${(props) => props.theme.table.input.color};

    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    /* remove borders */
    border: none;
    outline: none;
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

  .shortcut-error {
    color: ${(props) => props.theme.colors?.text?.red || '#ef4444'};
    font-size: 11px;
    margin-left: 8px;
    white-space: nowrap;
    font-weight: 500;
  }

  .shortcut-input--error {
    opacity: 1;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  /* ✅ This is THE scroll container */
  .table-container {
    flex: 1 1 auto;
    min-height: 0; /* crucial for scrolling in flex layouts */
    max-height: 650px;
    overflow-y: auto;

    border-radius: 8px;
    border-top: 1px solid ${(props) => props.theme.table.border};
    border-bottom: 1px solid ${(props) => props.theme.table.border};

    /* hide scrollbar (Chromium/Electron) */
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

    /* solid bg + blur so rows never bleed through */
    background: ${(props) => props.theme.background};
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);

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
