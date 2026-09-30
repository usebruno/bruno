import styled from 'styled-components';

const StyledWrapper = styled.div`
  color: ${(props) => props.theme.colors.danger};

  pre {
    display: block;
    overflow-wrap: anywhere;
  }
`;

export default StyledWrapper;
