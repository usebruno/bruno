import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;

  /* CodeEditor container */
  .code-editor-container {
    flex: 1;
    min-height: 300px;
    height: 300px;
  }
`;

export default StyledWrapper;
