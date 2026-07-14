import { css } from 'styled-components';

/**
 * Shared prose styles for docs preview (.markdown-body) and WYSIWYG editor (.tiptap).
 * Keeps typography and table appearance consistent between edit and preview.
 */
const docsContentStyles = css`
  color: ${(props) => props.theme.text};
  background: transparent;
  font-size: ${(props) => props.theme.font.size.base};

  > :first-child {
    margin-top: 0;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-weight: var(--base-text-weight-semibold, 600);
    line-height: 1.25;
  }

  h1 {
    margin: 0.67em 0;
    padding-bottom: 0.3em;
    font-size: 2em;
    border-bottom: 1px solid ${(props) => props.theme.dropdown.separator};
  }

  h2 {
    padding-bottom: 0.3em;
    font-size: 1.5em;
    border-bottom: 1px solid ${(props) => props.theme.dropdown.separator};
  }

  h3 {
    font-size: 1.25em;
  }

  h4 {
    font-size: 1.125em;
  }

  h5 {
    font-size: 1em;
  }

  h6 {
    font-size: 0.875em;
    color: ${(props) => props.theme.colors.text.muted};
  }

  p {
    margin: 0.5rem 0;
  }

  ul,
  ol {
    padding-left: 1.25rem;
    margin: 0.75rem 0;
  }

  ul {
    list-style-type: disc;
  }

  ul[data-type='taskList'],
  ul.contains-task-list {
    list-style: none;
    padding-left: 0;
    margin: 0.75rem 0;
  }

  ul[data-type='taskList'] > li,
  li.docs-task-item,
  .task-list-item {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    list-style: none;
    margin: 0.25rem 0;
  }

  ul[data-type='taskList'] > li > label,
  li.docs-task-item > label {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: flex-start;
    margin: 0;
    padding-top: 0.125em;
    user-select: none;
  }

  ul[data-type='taskList'] > li > label > span,
  li.docs-task-item > label > span {
    display: none;
  }

  ul[data-type='taskList'] input[type='checkbox'],
  li.docs-task-item input[type='checkbox'],
  .task-list-item-checkbox {
    width: 14px;
    height: 14px;
    margin: 0.2em 0 0;
    flex-shrink: 0;
    cursor: pointer;
    vertical-align: top;
  }

  ul[data-type='taskList'] > li > div,
  li.docs-task-item > div {
    flex: 1 1 auto;
    min-width: 0;
  }

  ul[data-type='taskList'] > li > div > p,
  li.docs-task-item > div > p,
  .task-list-item > p {
    margin: 0;
    line-height: 1.5;
  }

  ol {
    list-style-type: decimal;
  }

  code {
    background-color: ${(props) => props.theme.codemirror.gutter.bg};
    border-radius: 4px;
    font-size: 0.85em;
    padding: 0.15em 0.35em;
    font-family: ${(props) => props.theme.font.monospace || 'monospace'};
  }

  pre {
    background-color: ${(props) => props.theme.codemirror.gutter.bg};
    color: ${(props) => props.theme.text};
    font-family: ${(props) => props.theme.font.monospace || 'monospace'};
    margin: 1rem 0;
    padding: 0.75rem 1rem;
    border-radius: 4px;
    overflow-x: auto;

    code {
      background: none;
      padding: 0;
      font-size: 0.85em;
    }
  }

  blockquote {
    border-left: 3px solid ${(props) => props.theme.primary.solid};
    margin: 1rem 0;
    padding-left: 1rem;
    color: ${(props) => props.theme.colors.text.muted};
  }

  hr {
    border: none;
    border-top: 1px solid ${(props) => props.theme.dropdown.separator};
    margin: 1.5rem 0;
  }

  img,
  .docs-image {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
    margin: 0.5rem 0;
  }

  video {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
    margin: 0.5rem 0;
  }

  table,
  table.docs-table {
    display: table;
    width: 100%;
    max-width: 100%;
    margin: 1rem 0;
    border-collapse: collapse;
    border-spacing: 0;
    table-layout: fixed;
    overflow: visible;
    font-variant: normal;
    font-size: inherit;

    th,
    td {
      border: 1px solid ${(props) => props.theme.table.border};
      background-color: transparent;
      box-sizing: border-box;
      padding: 12px 16px;
      vertical-align: top;
      position: relative;
      min-width: 60px;
      min-height: calc(1.5em + 24px);
      line-height: 1.5;
      word-break: break-word;
    }

    th:empty::before,
    td:empty::before {
      content: '\\00a0';
      display: inline-block;
      min-height: 1.5em;
    }

    th {
      font-weight: 600;
      text-align: left;
      background-color: ${(props) => props.theme.table.striped};

    }

    p {
      margin: 0;
      min-height: 1.5em;
      line-height: 1.5;
    }
  }
  a,
  .docs-link {
    color: ${(props) => props.theme.textLink};
    text-decoration: none;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }
`;

export default docsContentStyles;
