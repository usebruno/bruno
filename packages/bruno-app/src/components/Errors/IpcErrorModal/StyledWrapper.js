import styled from 'styled-components';

const StyledWrapper = styled.div`
  color: ${(props) => props.theme.colors.danger};
  pre {
    color: ${(props) => props.theme.colors.danger};
    max-height: 60vh;
    overflow: auto;
  }
`;

export default StyledWrapper;
