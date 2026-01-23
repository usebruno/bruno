import styled from 'styled-components';

const StyledWrapper = styled.div`
  padding: 8px 10px;
  border-radius: ${(props) => props.theme.border.radius.sm};
  font-size: 13px;
  line-height: 1.5;

  &.user {
    background: ${(props) => props.theme.brand};
    color: ${(props) => props.theme.colors.text.white};
    align-self: flex-end;
    max-width: 90%;
    padding: 8px 12px;
    border-radius: ${(props) => props.theme.border.radius.sm}
                   ${(props) => props.theme.border.radius.sm}
                   2px
                   ${(props) => props.theme.border.radius.sm};
  }

  &.error {
    background: rgba(248, 81, 73, 0.08);
    color: ${(props) => props.theme.colors.text.danger};
    border-left: 2px solid ${(props) => props.theme.colors.text.danger};
    padding: 6px 10px;
    font-size: 12px;
  }

  &.success {
    color: ${(props) => props.theme.colors.text.green};
    font-size: 12px;
    padding: 4px 0;
  }

  &.info {
    color: ${(props) => props.theme.colors.text.muted};
    font-size: 12px;
    padding: 4px 0;
  }

  &.warning {
    background: rgba(255, 193, 7, 0.08);
    color: ${(props) => props.theme.colors.text.yellow || '#d97706'};
    border-left: 2px solid ${(props) => props.theme.colors.text.yellow || '#d97706'};
    padding: 6px 10px;
    font-size: 12px;
  }

  &.assistant {
    padding: 8px 10px;
    background: ${(props) => props.theme.sidebar.collection.item.bg};
    border-radius: ${(props) => props.theme.border.radius.sm};

    &.is-code {
      padding: 0;
      background: transparent;
    }
  }

  .markdown-content {
    h1, h2, h3, h4, h5, h6 {
      color: ${(props) => props.theme.colors.text.primary};
      margin-top: 8px;
      margin-bottom: 4px;
      font-weight: 600;
      line-height: 1.3;
    }

    h1 { font-size: 1.15em; }
    h2 { font-size: 1.1em; }
    h3 { font-size: 1.05em; }

    p {
      margin: 4px 0;
      &:first-child { margin-top: 0; }
      &:last-child { margin-bottom: 0; }
    }

    code {
      background: ${(props) => props.theme.codemirror.bg};
      padding: 1px 4px;
      border-radius: 3px;
      font-family: ${(props) => props.theme.codemirror.font};
      font-size: 0.9em;
      color: ${(props) => props.theme.codemirror.tokens.string};
    }

    pre {
      background: ${(props) => props.theme.codemirror.bg};
      border: 1px solid ${(props) => props.theme.codemirror.border};
      border-radius: ${(props) => props.theme.border.radius.sm};
      padding: 8px;
      overflow-x: auto;
      margin: 6px 0;

      code {
        background: none;
        padding: 0;
        border-radius: 0;
        color: ${(props) => props.theme.colors.text.primary};
      }
    }

    ul, ol {
      padding-left: 16px;
      margin: 4px 0;
    }

    li { margin: 2px 0; }

    a {
      color: ${(props) => props.theme.textLink};
      text-decoration: none;
      &:hover { text-decoration: underline; }
    }

    blockquote {
      border-left: 2px solid ${(props) => props.theme.brand};
      margin: 4px 0;
      padding-left: 8px;
      color: ${(props) => props.theme.colors.text.muted};
    }

    strong {
      font-weight: 600;
      color: ${(props) => props.theme.colors.text.primary};
    }

    em { font-style: italic; }

    hr {
      border: none;
      border-top: 1px solid ${(props) => props.theme.sidebar.dragbar.border};
      margin: 8px 0;
    }

    table {
      border-collapse: collapse;
      width: 100%;
      margin: 6px 0;
      font-size: 12px;
    }

    th, td {
      border: 1px solid ${(props) => props.theme.sidebar.dragbar.border};
      padding: 4px 6px;
      text-align: left;
    }

    th {
      background: ${(props) => props.theme.sidebar.collection.item.bg};
      font-weight: 600;
    }
  }
`;

export default StyledWrapper;
