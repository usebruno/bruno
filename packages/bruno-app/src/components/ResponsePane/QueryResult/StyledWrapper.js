import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: grid;
  grid-template-columns: 100%;
  grid-template-rows: 50px calc(100% - 50px);

  /* If there is only one element (the preview, not tabs) make it span over both grid rows */
  > *:last-child:first-child {
    grid-row: 1 / 3;
    margin-top: 1.25rem;
    height: calc(100% - 1.25rem);
  }

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
