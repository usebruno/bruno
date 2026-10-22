import styled from 'styled-components';

const StyledWrapper = styled.div`
  .textbox {
    padding: 0.15rem 0.45rem;
    border-radius: 3px;
    background-color: ${(props) => props.theme.input.bg};
    border: solid 1px ${(props) => props.theme.input.border};
    outline: none;
    transition: border-color ease-in-out 0.1s;

    &:focus {
      border: solid 1px ${(props) => props.theme.input.focusBorder} !important;
      outline: none !important;
    }
  }

  .warning-box {
    border: solid 1px ${(props) => props.theme.colors?.warning || '#d97706'};
    background-color: ${(props) => props.theme.colors?.warningBg || 'rgba(217, 119, 6, 0.08)'};
    border-radius: 3px;
  }

  .script-row {
    border-bottom: 1px solid ${(props) => props.theme.rule ?? props.theme.colors?.border ?? '#e5e7eb'};
  }

  .test-output {
    background-color: ${(props) => props.theme.console?.bg ?? '#1e1e1e'};
    color: ${(props) => props.theme.console?.font ?? '#d4d4d4'};
    border-radius: 3px;
    font-family: ${(props) => props.theme.font?.code || 'monospace'};
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-all;
  }
`;

export default StyledWrapper;
