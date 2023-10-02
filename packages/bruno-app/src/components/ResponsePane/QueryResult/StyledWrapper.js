import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: grid;
  grid-template-columns: 100%;
  grid-template-rows: 1.25rem calc(100% - 1.25rem);

  /* This is a hack to force Codemirror to use all available space */
  > div {
    position: relative;
  }

  div.CodeMirror {
    position: absolute;
    top: 0;
    bottom: 0;
    height: 100%;
    width: 100%;
  }
`;

export default StyledWrapper;
