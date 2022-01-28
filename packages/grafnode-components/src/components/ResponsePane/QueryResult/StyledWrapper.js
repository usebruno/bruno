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
`;

export default StyledWrapper;

