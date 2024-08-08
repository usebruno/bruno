import styled from 'styled-components';

const StyledMarkdownBodyWrapper = styled.div`
  background: transparent;
  .markdown-body {
    background: transparent;
    overflow-y: auto;
    color: ${(props) => props.theme.text};
    box-sizing: border-box;
    height: 100%;
    margin: 0 auto;
    padding-top: 0.5rem;
    font-size: 0.875rem;

    h1 {
      margin: 0.67em 0;
      font-weight: var(--base-text-weight-semibold, 600);
      padding-bottom: 0.3em;
      font-size: 1.3;
      border-bottom: 1px solid var(--color-border-muted);
    }

    h2 {
      font-weight: var(--base-text-weight-semibold, 600);
      padding-bottom: 0.3em;
      font-size: 1.2;
      border-bottom: 1px solid var(--color-border-muted);
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
      border-bottom: 1px solid var(--color-border-muted);
      height: 1px;
      padding: 0;
      margin: 24px 0;
      background-color: var(--color-border-default);
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
      color: ${(props) => props.theme.text};
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
