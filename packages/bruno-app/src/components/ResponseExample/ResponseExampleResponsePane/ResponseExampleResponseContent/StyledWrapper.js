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

  .response-example-preview-container {
    flex: 1;
    min-height: 300px;
    height: 300px;
    overflow: auto;

    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
  }
`;

export default StyledWrapper;
