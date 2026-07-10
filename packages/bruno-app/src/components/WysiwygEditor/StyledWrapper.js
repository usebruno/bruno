import styled from 'styled-components';
import docsContentStyles from 'components/Documentation/docsContentStyles';

const StyledWrapper = styled.div`
  .wysiwyg-editor-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .tiptap {
    height: 100%;
    outline: none;
    caret-color: ${(props) => props.theme.colors.text.yellow};
    ${docsContentStyles}

    p:not(table p),
    h1,
    h2,
    h3,
    h4,
    h5,
    h6,
    li:not([data-type='taskItem']):not(.docs-task-item):not(.task-list-item) {
      min-height: 1.5em;
    }

    &.ProseMirror-focused {
      outline: none;
    }

    .ProseMirror-gapcursor {
      display: none;
      pointer-events: none;
      position: absolute;
    }

    &.ProseMirror-focused .ProseMirror-gapcursor {
      display: block;
    }

    .ProseMirror-gapcursor::after {
      content: '';
      display: block;
      position: absolute;
      top: 0;
      left: -1px;
      width: 2px;
      height: 1.25em;
      background-color: ${(props) => props.theme.colors.text.yellow};
      animation: docs-editor-cursor-blink 1.1s steps(2, start) infinite;
    }

    .ProseMirror-gapcursor-after-table {
      transform: translateY(0.5rem);
    }

    @keyframes docs-editor-cursor-blink {
      to {
        visibility: hidden;
      }
    }

    ul[data-type='taskList'] input[type='checkbox'],
    li.docs-task-item input[type='checkbox'] {
      accent-color: ${(props) => props.theme.primary.solid};
    }

    table.docs-table {
      .column-resize-handle {
        position: absolute;
        right: -3px;
        top: 0;
        bottom: 0;
        width: 6px;
        background-color: ${(props) => props.theme.dropdown.selectedColor};
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.15s ease;
        z-index: 2;
      }

      .column-resize-dragging {
        background-color: ${(props) => props.theme.dropdown.hoverBg};
      }
    }

    &.resize-cursor {
      cursor: col-resize;

      .column-resize-handle {
        opacity: 1;
      }
    }
  }

  &.resize-cursor {
    cursor: col-resize;
  }
`;

export default StyledWrapper;
