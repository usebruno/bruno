import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  border-radius: 4px;
  border: 1px solid ${(props) => props.theme.console.border};

  .result-type-selector {
    border-bottom: 1px solid ${(props) => props.theme.console.border};
  }
`;

export default StyledWrapper;
