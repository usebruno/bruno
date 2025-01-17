import styled from 'styled-components';

const StyledWrapper = styled.div`
  div.CodeMirror {
    /* todo: find a better way */
    height: calc(100vh - 240px);

    .CodeMirror-scroll {
      padding-bottom: 0px;
    }
  }
  .editing-mode {
    cursor: pointer;
  }
`;

export default StyledWrapper;
