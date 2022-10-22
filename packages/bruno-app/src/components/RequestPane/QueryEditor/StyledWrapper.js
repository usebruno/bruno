import styled from 'styled-components';

const StyledWrapper = styled.div`
  div.CodeMirror {
    background: ${(props) => props.theme.codemirror.bg};
    border: solid 1px ${(props) => props.theme.codemirror.border};
    /* todo: find a better way */
    height: calc(100vh - 250px);
  }

  textarea.cm-editor {
    position: relative;
  }
`;

export default StyledWrapper;
