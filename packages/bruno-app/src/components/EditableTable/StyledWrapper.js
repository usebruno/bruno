import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: block;
  width: 100%;
  isolation: isolate;

  &.is-resizing {
    cursor: col-resize !important;
    user-select: none;
  }

  .table-container {
    border-radius: ${(props) => props.theme.border.radius.base};
    border: solid 1px ${(props) => props.theme.border.border0};
    overflow: clip;
  }

  /* Sticky section rows must stick to the pane scroller, not this clip box. */
  &.has-section-rows .table-container {
    overflow: visible;
  }

  &.has-section-rows thead tr {
    height: 35px;
  }

  &.has-section-rows thead td {
    height: 35px;
    box-sizing: border-box;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
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
    position: sticky;
    top: 0;
    z-index: 13;

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

      &.sortable-header {
        cursor: pointer;
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
        right: -2px;
        top: 0;
        width: 5px;
        height: 100%;
        cursor: col-resize;
        background: transparent;
        z-index: 10;

        &::after {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          left: 50%;
          width: 1px;
          transform: translateX(-50%);
          background: transparent;
        }

        &:hover::after,
        &.resizing::after {
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
      height: 35px;
      max-height: 35px;
      transition: background 0.1s ease;

      &:last-child td {
        border-bottom: none;
      }

      td {
        height: 35px;
        max-height: 35px;
        padding: 1px 10px !important;
        border-top: none !important;
        border-left: none !important;
        border-bottom: solid 1px ${(props) => props.theme.border.border0};
        border-right: solid 1px ${(props) => props.theme.border.border0};
        vertical-align: middle;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        box-sizing: border-box;

        > div:not(.drag-handle) {
          height: 33px;
          max-height: 33px;
          overflow: hidden;
        }

        /* Single-line CodeMirror editors: clip overflow to one row */
        .single-line-editor .CodeMirror {
          max-width: 100%;
          height: 33px !important;
          max-height: 33px !important;

          .CodeMirror-scroll {
            overflow: hidden !important;
            max-height: 33px;
          }

          .CodeMirror-vscrollbar,
          .CodeMirror-hscrollbar,
          .CodeMirror-scrollbar-filler {
            display: none;
          }

          .CodeMirror-lines {
            max-width: 100%;
          }

          .CodeMirror-line {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }

        &:has(.multi-line-editor) {
          height: auto;
          max-height: none;
          overflow: visible;
          white-space: normal;
          text-overflow: clip;

          > div:not(.drag-handle) {
            height: auto;
            max-height: none;
            overflow: visible;
          }
        }
      }

      &:has(.multi-line-editor) {
        height: auto;
        max-height: calc(35px * 3); 
        overflow: auto;
      }

      &.section-header-row {
        position: sticky;
        /* 1px under thead so scrolling rows cannot peek through a subpixel gap. */
        top: 34px;
        z-index: 12;
        background: ${(props) => props.theme.sidebar.bg};

        td.full-width-row {
          position: sticky;
          top: 34px;
          z-index: 12;
          height: 35px;
          max-height: 35px;
          padding: 0 !important;
          border-right: none;
          /* border-collapse drops the shared edge; paint the divider ourselves. */
          border-bottom: solid 1px ${(props) => props.theme.border.border0} !important;
          overflow: visible;
          background: ${(props) => props.theme.sidebar.bg};
          box-shadow:
            0 -1px 0 ${(props) => props.theme.sidebar.bg},
            inset 0 -1px 0 ${(props) => props.theme.border.border0};

          > * {
            height: 100%;
            max-height: none;
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
    text-overflow: clip;

    input[type='checkbox'] {
      vertical-align: baseline;
      display: inline-block;
    }
  }

  .tooltip-mod {
    max-width: 200px !important;
    word-wrap: break-word !important;
    overflow-wrap: break-word !important;
    white-space: normal !important;
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
    
    &::placeholder {
      color: ${(props) => props.theme.codemirror.placeholder.color} !important;
      opacity: ${(props) => props.theme.codemirror.placeholder.opacity} !important;
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
    opacity: 0;
    transition: opacity 0.1s ease;
    display: flex;
    align-items: center;
    justify-content: center;

    .icon-grip,
    .icon-minus {
      color: ${(props) => props.theme.colors.text.muted};
    }
  }

  tbody tr:hover .drag-handle,
  tbody tr.drag-over .drag-handle {
    opacity: 1;
  }

  tbody tr.dragging-source {
    opacity: 0.4;
  }

  @keyframes row-focus-flash {
    0%, 60% {
      background-color: ${(props) => props.theme.status.warning.background};
    }
    100% {
      background-color: transparent;
    }
  }

  tbody tr.row-focus-flash td {
    animation: row-focus-flash 2.5s ease-in-out;
  }

  @media (prefers-reduced-motion: reduce) {
    tbody tr.row-focus-flash td {
      animation: none;
      background-color: ${(props) => props.theme.status.warning.background};
    }
  }

  select {
    background-color: transparent;
    color: ${(props) => props.theme.text};
    border: none;
    outline: none;
    padding: 2px 2px;
    width: 100%;
    box-sizing: border-box;
    font-size: 12px;
    cursor: pointer;

    option {
      background-color: ${(props) => props.theme.bg};
      color: ${(props) => props.theme.text};
    }
  }
`;

export default StyledWrapper;
