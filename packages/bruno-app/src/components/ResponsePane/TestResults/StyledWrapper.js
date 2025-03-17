import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: auto;
  max-height: calc(100vh - 210px);
  overflow-y: auto;
  
  .test-success {
    color: ${(props) => props.theme.colors.text.green};
  }

  .test-failure {
    color: ${(props) => props.theme.colors.text.danger};
  }

  .error-message {
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;
