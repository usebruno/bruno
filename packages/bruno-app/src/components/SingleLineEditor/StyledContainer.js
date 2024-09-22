import styled from 'styled-components';

const StyledContainer = styled.div`
  .copy-to-clipboard {
    opacity: 0;
  }

  &:hover .copy-to-clipboard {
    opacity: 0.5;
  }
`;

export default StyledContainer;
