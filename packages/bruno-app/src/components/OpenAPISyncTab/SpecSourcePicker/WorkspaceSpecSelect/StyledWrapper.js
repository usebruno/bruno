import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;

  .spec-select-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    text-align: left;
    cursor: pointer;

    &:disabled {
      cursor: not-allowed;
    }
  }

  .placeholder {
    color: ${(props) => props.theme.input.placeholder.color};
    opacity: ${(props) => props.theme.input.placeholder.opacity};
  }

  .caret {
    flex-shrink: 0;
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;
