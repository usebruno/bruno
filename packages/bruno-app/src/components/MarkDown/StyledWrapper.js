import styled from 'styled-components';
import editorContentStyles from 'ui/editorContentStyles';

const StyledMarkdownBodyWrapper = styled.div`
  background: transparent;

  .markdown-body {
    background: transparent;
    overflow-y: auto;
    box-sizing: border-box;
    height: 100%;
    margin: 0 auto;
    ${editorContentStyles}

    && table {
      display: table;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      table-layout: fixed;
    }

    && table th,
    && table td {
      padding: 6px 13px;
      min-height: calc(1.5em + 12px);
      line-height: 1.5;
    }

    && table p {
      margin: 0;
      min-height: 1.5em;
      line-height: 1.5;
    }

    p,
    div {
      white-space: pre-wrap;
    }
  }
`;

export default StyledMarkdownBodyWrapper;
