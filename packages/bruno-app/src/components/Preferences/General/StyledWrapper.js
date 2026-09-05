import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;

  color: ${(props) => props.theme.text};

  form.settings-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 40rem;
  }

  .ca-certificate-picker {
    display: flex;

    &.is-disabled {
      opacity: 0.5;
    }
  }

  .ca-certificate-select,
  .ca-certificate-file {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    font-size: ${(props) => props.theme.font.size.base};
    line-height: 1.25;
    color: ${(props) => props.theme.text};
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: none;
  }

  .ca-certificate-select {
    cursor: pointer;
    gap: 0.375rem;

    &:not(:disabled):hover {
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    &:disabled {
      cursor: not-allowed;
    }
  }

  .ca-certificate-remove {
    display: inline-flex;
    align-items: center;
    padding: 0;
    border: none;
    background: none;
    line-height: 0;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;

    &:not(:disabled):hover {
      color: ${(props) => props.theme.colors.text.danger};
    }

    &:disabled {
      cursor: not-allowed;
    }
  }

  .numeric-input {
    width: 100%;
    max-width: 14rem;
  }

  .default-location-field {
    .settings-field-control {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.375rem;
    }

    .default-location-input {
      width: 100%;
    }
  }

  .default-location-browse {
    padding: 0;
    border: none;
    background: none;
    font-family: inherit;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.textLink};
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }
`;

export default StyledWrapper;
