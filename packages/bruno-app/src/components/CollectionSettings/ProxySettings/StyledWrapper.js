import styled from 'styled-components';

const StyledWrapper = styled.div`
  .proxy-settings {
    max-width: 560px;
    font-size: ${(props) => props.theme.font.size.base};
  }

  .settings-label {
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 500;
  }

  .sub-label {
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 400;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .hint {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
  }

  .textbox,
  .single-line-editor-wrapper {
    width: 100%;
    min-width: 0;
    height: 34px;
    padding: 0 10px;
    border-radius: 4px;
    border: 1px solid ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.input.bg};
    box-shadow: none;
    outline: none;
    transition: border-color ease-in-out 0.1s;
  }

  .textbox:focus,
  .single-line-editor-wrapper:focus-within {
    border: solid 1px ${(props) => props.theme.input.focusBorder} !important;
    outline: none !important;
  }

  .protocol-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 200px;
    height: 34px;
    padding: 0 10px;
    border-radius: 4px;
    border: 1px solid ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.input.bg};
    color: ${(props) => props.theme.text};
    cursor: pointer;
    transition: border-color ease-in-out 0.1s;

    &:hover,
    &:focus-visible {
      border-color: ${(props) => props.theme.input.focusBorder};
      outline: none;
    }
  }

  .single-line-editor-wrapper {
    display: flex;
    align-items: center;
  }

  .mono,
  .mono .CodeMirror pre {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
    font-size: ${(props) => props.theme.font.size.sm};
  }
`;

export default StyledWrapper;
