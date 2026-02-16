import styled from 'styled-components';

const StyledWrapper = styled.div`
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  line-height: 20px;
  padding: 16px;
  overflow: auto;
  color: ${(props) => props.theme.text};

  .xml-container {
    color: ${(props) => props.theme.text};
  }

  .xml-node-name {
    color: ${(props) => props.theme.codemirror.tokens.property};
    font-weight: 500;
  }

  .xml-separator {
    color: ${(props) => props.theme.codemirror.tokens.operator};
    margin: 0 8px;
  }

  .xml-value {
    color: ${(props) => props.theme.codemirror.tokens.string};
    white-space: pre-wrap;
    word-break: break-all;
  }

  .xml-empty-value {
    color: ${(props) => props.theme.codemirror.tokens.comment};
  }

  .xml-count {
    color: ${(props) => props.theme.codemirror.tokens.comment};
    margin-left: 8px;
  }

  .xml-toggle-button {
    margin-right: 8px;
    cursor: pointer;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${(props) => props.theme.codemirror.tokens.atom};
    flex-shrink: 0;
    border-radius: 4px;
    transition: background-color 0.2s;

    &:hover {
      background-color: ${(props) => props.theme.console.buttonHoverBg};
    }
  }

  .xml-array-toggle-button {
    margin-right: 8px;
    cursor: pointer;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${(props) => props.theme.codemirror.tokens.atom};
    flex-shrink: 0;
    border-radius: 4px;
    transition: background-color 0.2s;

    &:hover {
      background-color: ${(props) => props.theme.console.buttonHoverBg};
    }
  }
`;

export default StyledWrapper;
