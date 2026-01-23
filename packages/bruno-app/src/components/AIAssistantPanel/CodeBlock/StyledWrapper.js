import styled from 'styled-components';

const StyledWrapper = styled.div`
border-radius: ${(props) => props.theme.border.radius.sm};
overflow: hidden;
background: ${(props) => props.theme.codemirror.bg};
border: 1px solid ${(props) => props.theme.codemirror.border};

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 8px;
  background: rgba(0, 0, 0, 0.15);
  font-size: 10px;
  color: ${(props) => props.theme.colors.text.muted};

  .copy-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: ${(props) => props.theme.colors.text.muted};
    border-radius: 2px;
    transition: all 0.15s ease;

    &:hover {
      color: ${(props) => props.theme.colors.text.primary};
    }

    &.copied {
      color: ${(props) => props.theme.colors.text.green};
    }
  }
}

.code-content {
  display: flex;
  padding: 6px 8px;
  overflow-x: auto;
  font-family: ${(props) => props.theme.codemirror.font};
  font-size: 11px;
  line-height: 1.5;
  margin: 0;

  &::-webkit-scrollbar {
    height: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${(props) => props.theme.scrollbar.color};
    border-radius: 2px;
  }

  .line-numbers {
    display: flex;
    flex-direction: column;
    padding-right: 8px;
    border-right: 1px solid rgba(255, 255, 255, 0.08);
    margin-right: 8px;
    color: ${(props) => props.theme.colors.text.muted};
    user-select: none;
    text-align: right;
    opacity: 0.4;
    font-size: 10px;
  }

  code {
    flex: 1;
    white-space: pre-wrap;
    word-break: break-word;
    color: ${(props) => props.theme.colors.text.primary};
  }

  .token-keyword { color: ${(props) => props.theme.codemirror.tokens.keyword}; }
  .token-string { color: ${(props) => props.theme.codemirror.tokens.string}; }
  .token-number { color: ${(props) => props.theme.codemirror.tokens.number}; }
  .token-comment { color: ${(props) => props.theme.codemirror.tokens.comment}; font-style: italic; }
  .token-operator { color: ${(props) => props.theme.codemirror.tokens.operator}; }
  .token-property { color: ${(props) => props.theme.codemirror.tokens.property}; }
  .token-function { color: ${(props) => props.theme.codemirror.tokens.definition}; }
  .token-variable { color: ${(props) => props.theme.codemirror.tokens.variable}; }
  .token-atom { color: ${(props) => props.theme.codemirror.tokens.atom}; }
  .token-punctuation { color: ${(props) => props.theme.colors.text.muted}; }
}
`;

export default StyledWrapper;
