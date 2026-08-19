import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;

  .react-pdf__Page {
    margin-top: 10px;
    background-color: transparent !important;
  }
  .react-pdf__Page__textContent {
    border: 1px solid ${(props) => props.theme.border.border1};
    box-shadow: ${(props) => props.theme.shadow.md};
    border-radius: 0px;
    margin: 0 auto;
  }
  .react-pdf__Page__canvas {
    margin: 0 auto;
  }
`;

export default StyledWrapper;
