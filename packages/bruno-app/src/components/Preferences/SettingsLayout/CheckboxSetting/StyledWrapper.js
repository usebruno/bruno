import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;

  .setting-checkbox-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    input[type='checkbox'] {
      margin: 0;
      flex-shrink: 0;
    }
  }

  .setting-checkbox-label {
    font-size: ${(props) => props.theme.font.size.base};
    color: ${(props) => props.theme.text};
    cursor: pointer;
    margin: 0;
  }

  .setting-checkbox-description {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
    margin: 0.125rem 0 0 1.5rem;
  }

  .setting-checkbox-children {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin: 0.75rem 0 0 1.5rem;
  }

  &.is-disabled {
    .setting-checkbox-label {
      color: ${(props) => props.theme.colors.text.muted};
      cursor: not-allowed;
    }

    input[type='checkbox'] {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }
`;

export default StyledWrapper;
