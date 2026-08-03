import styled from 'styled-components';

const StyledWrapper = styled.div`
  .app-toolbar {
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
  }

  .app-editor {
    div.CodeMirror {
      height: inherit;
    }
  }
`;

export default StyledWrapper;
