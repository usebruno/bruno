import styled from 'styled-components';

const StyledMarkdownBodyWrapper = styled.div`
  .markdown-body {
    background: transparent;
    color: ${(props) => props.theme.text};
    overflow-y: scroll;
    overflow-x: hidden;
    box-sizing: border-box;
    margin: 0 auto;
    font-size: 0.875rem;

    ::-webkit-scrollbar-corner {
      background-color: transparent;
    }

    // Add this to change the background on hover
    &:hover {
      border-radius: 4px;
      background-color: ${(props) => props.theme.markDownEditor.hoverBg};
      box-shadow: 0 0 0 5px ${(props) => props.theme.markDownEditor.hoverBg}; // Use the same color as the hover background
    }

    h1 {
      margin: 0.67em 0;
      font-weight: var(--base-text-weight-semibold, 600);
      padding-bottom: 0.3em;
      font-size: 1.3;
      border-bottom: 1px solid ${(props) => props.theme.table.border};
    }

    h2 {
      font-weight: var(--base-text-weight-semibold, 600);
      padding-bottom: 0.3em;
      font-size: 1.2;
      border-bottom: 1px solid ${(props) => props.theme.table.border};
    }

    h3 {
      font-weight: var(--base-text-weight-semibold, 600);
      font-size: 1.1em;
    }

    h4 {
      font-weight: var(--base-text-weight-semibold, 600);
      font-size: 1em;
    }

    h5 {
      font-weight: var(--base-text-weight-semibold, 600);
      font-size: 0.95em;
    }

    h6 {
      font-weight: var(--base-text-weight-semibold, 600);
      font-size: 0.9em;
      color: var(--color-fg-muted);
    }

    hr {
      box-sizing: content-box;
      overflow: hidden;
      border-bottom: 1px solid ${(props) => props.theme.table.border};
      height: 1px;
      padding: 0;
      margin: 24px 0;
      background-color: ${(props) => props.theme.table.border};
      border: 0;
    }

    ul {
      list-style-type: disc;
    }

    ol {
      list-style-type: decimal;
    }

    pre {
      background: ${(props) => props.theme.sidebar.bg};
    }

    table {
      th,
      td {
        border: 1px solid ${(props) => props.theme.table.border};
        background-color: ${(props) => props.theme.bg};
      }
    }
  }

  @media (max-width: 767px) {
    .markdown-body {
      padding: 15px;
    }
  }
`;

export default StyledMarkdownBodyWrapper;
