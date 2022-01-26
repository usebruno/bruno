import styled from 'styled-components';

const StyledWrapper = styled.div`
  div.CodeMirror {
    border: solid 1px var(--color-codemirror-border);
    /* todo: find a better way */
    height: calc(100vh - 230px);
  }

  textarea.cm-editor {
    position: relative;
  }

  div.overlay{
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    bottom: 0;
    z-index: 9;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    text-align: center;
    background: rgb(243 243 243 / 78%);
  }
`;

export default StyledWrapper;

