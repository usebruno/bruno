import styled from 'styled-components';

const StyledWrapper = styled.div`
  .settings-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 720px;
  }

  .tags-field {
    div:has(> [data-testid='tag-input']) {
      height: 34px;
      border-radius: 4px;
      border: 1px solid ${(props) => props.theme.input.border};
      background-color: ${(props) => props.theme.input.bg};
      transition: border-color ease-in-out 0.1s;

      &:focus-within {
        border-color: ${(props) => props.theme.input.focusBorder};
      }
    }
  }
`;

export default StyledWrapper;
