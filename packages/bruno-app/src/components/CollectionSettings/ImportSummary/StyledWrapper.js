import styled from 'styled-components';

const StyledWrapper = styled.div`
  .text-muted {
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper; 