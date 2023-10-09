import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: inherit;
  .head {
    font-weight: var(--base-text-weight-semibold, 600);
    padding-bottom: 0.3em;
    font-size: 1.5em;
  }
  .markdown-body {
    overflow-y: auto;
    color: ${(props) => props.theme.text};
    box-sizing: border-box;
    height: 100%;
    margin: 0 auto;
    margin-top: -15px;
    padding: 1em;
    font-size: 0.875rem;
  }

  .markdown-body h2 {
    font-weight: var(--base-text-weight-semibold, 600);
    padding-bottom: 0.3em;
    font-size: 1.125em;
    border-bottom: 1px solid var(--color-border-muted);
  }

  .markdown-body h3 {
    font-weight: var(--base-text-weight-semibold, 600);
    font-size: 1em;
  }

  .markdown-body h4 {
    font-weight: var(--base-text-weight-semibold, 600);
    font-size: 0.875em;
  }

  .markdown-body h5 {
    font-weight: var(--base-text-weight-semibold, 600);
    font-size: 0.85em;
  }

  .markdown-body h6 {
    font-weight: var(--base-text-weight-semibold, 600);
    font-size: 0.8em;
    color: var(--color-fg-muted);
  }

  .markdown-body h1 {
    margin: 0.67em 0;
    font-weight: var(--base-text-weight-semibold, 600);
    padding-bottom: 0.3em;
    font-size: 1.375em;
    border-bottom: 1px solid var(--color-border-muted);
  }

  .markdown-body hr {
    box-sizing: content-box;
    overflow: hidden;
    background: transparent;
    border-bottom: 1px solid var(--color-border-muted);
    height: 1px;
    padding: 0;
    margin: 24px 0;
    background-color: var(--color-border-default);
    border: 0;
  }

  .markdown-body ul {
    list-style-type: disc;
  }

  .markdown-body ol {
    list-style-type: decimal;
  }

  @media (max-width: 767px) {
    .markdown-body {
      padding: 15px;
    }
  }
`;

export default StyledWrapper;
