import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-self: stretch;
  min-width: 4.1rem;

  > div {
    display: flex;
    flex: 1;
  }

  button {
    width: 100%;
    height: 100%;
  }
`;

export default StyledWrapper;
