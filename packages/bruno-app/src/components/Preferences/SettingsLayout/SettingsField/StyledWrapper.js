import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;

  .settings-field-label {
    font-size: ${(props) => props.theme.font.size.base};
    color: ${(props) => props.theme.text};
    margin: 0;
  }

  .settings-field-hint {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
    margin: 0.125rem 0 0 0;
  }

  .settings-field-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.375rem;
  }

  .settings-field-error {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.danger};
    margin-top: 0.25rem;
  }

  &.is-disabled .settings-field-label {
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;
