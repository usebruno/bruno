import styled from 'styled-components';

const StyledWrapper = styled.div`
  width: 100%;
  height: 100%;
  padding: 1rem;
    
  button.btn-create-environment {
    &:hover {
      span {
        text-decoration: underline;
      }
    }
  }
`;

export default StyledWrapper;
