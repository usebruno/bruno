import styled from 'styled-components';

const StyledWrapper = styled.div`
  .react-pdf__Page {
    margin-top: 10px;
    background-color: transparent !important;
  }
  .react-pdf__Page__textContent {
    border: 1px solid darkgrey;
    box-shadow: 5px 5px 5px 1px #ccc;
    border-radius: 0px;
    margin: 0 auto;
  }
  .react-pdf__Page__canvas {
    margin: 0 auto;
  }
`;

export default StyledWrapper;
