import styled from 'styled-components';

const StyledWrapper = styled.div`
  button {
    color: ${(props) => props.theme.colors.text.subtext0};
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
    color: ${(props) => props.theme.colors.text.subtext0};

    &:hover {
      color: var(--color-tab-active);
    }
  }
`;

export default StyledWrapper;
