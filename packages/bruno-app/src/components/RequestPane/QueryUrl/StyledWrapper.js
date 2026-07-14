import styled from 'styled-components';

const Wrapper = styled.div`
  min-height: 2.1rem;

  .url-row {
    position: relative;
    min-height: 2.1rem;
    z-index: 0;
  }

  .url-input-group {
    border: ${(props) => props.theme.requestTabPanel.url.border};
    border-radius: ${(props) => props.theme.border.radius.base};
    overflow: hidden;
    height: 2.1rem;
    transition: border-color 0.15s ease;
  }

  .url-input-group.focused {
    border-color: ${(props) => props.theme.input.focusBorder};
  }

  .url-input-group.expanded {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    z-index: 10;
    height: auto;
    overflow: visible;
    background: ${(props) => props.theme.requestTabPanel.url.bg};
    border-radius: ${(props) => props.theme.border.radius.base};
    border-color: ${(props) => props.theme.input.focusBorder};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }

  .url-input-group.expanded .CodeMirror {
    background: ${(props) => props.theme.requestTabPanel.url.bg} !important;
  }

`;

export default Wrapper;
