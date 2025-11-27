import styled from 'styled-components';

const StyledWrapper = styled.div`
  color: var(--color-text);

  .custom-theme-section {
    padding: 12px;
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: 4px;
    background: ${(props) => props.theme.bg};
  }

  .preset-theme-btn {
    padding: 6px 12px;
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: 4px;
    background: ${(props) => props.theme.input.bg};
    color: ${(props) => props.theme.text};
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s ease;

    &:hover {
      background: ${(props) => props.theme.colors.text.yellow};
      color: ${(props) => props.theme.bg};
      border-color: ${(props) => props.theme.colors.text.yellow};
    }
  }

  .file-input {
    padding: 6px;
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: 4px;
    background: ${(props) => props.theme.input.bg};
    color: ${(props) => props.theme.text};
    width: 100%;
    font-size: 13px;

    &:focus {
      outline: none;
      border-color: ${(props) => props.theme.input.focusBorder};
    }
  }

  details {
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: 4px;
    padding: 8px;
    background: ${(props) => props.theme.input.bg};
  }

  summary {
    color: ${(props) => props.theme.textLink};
    
    &:hover {
      opacity: 0.8;
    }
  }

  pre {
    background: ${(props) => props.theme.codemirror.bg};
    border: 1px solid ${(props) => props.theme.codemirror.border};
    border-radius: 4px;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  }

  code {
    background: ${(props) => props.theme.codemirror.bg};
    padding: 2px 4px;
    border-radius: 3px;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    font-size: 12px;
  }
`;

export default StyledWrapper;
