import styled from 'styled-components';

const StyledWrapper = styled.div`
  button {
    color: var(--color-tab-inactive);
    cursor: pointer;

    &:hover {
      color: var(--color-tab-active);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }

  .cursor-pointer {
    display: flex;
    align-items: center;
    color: var(--color-tab-inactive);

    &:hover {
      color: var(--color-tab-active);
    }
  }
`;

export default StyledWrapper;
