import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-self: stretch;
  min-width: 4.1rem;
  flex-shrink: 0;

  > div {
    display: flex;
    flex: 1;
  }

  button {
    width: 100%;
    height: 100%;
  }

  /* Env-colored Send button hover/active feedback */
  ${(props) =>
    props.$envColor && !props.$isLoading
      ? `
    button:hover {
      filter: brightness(0.88);
    }
    button:active {
      filter: brightness(0.78);
    }
  `
      : ''}
`;

export default StyledWrapper;
