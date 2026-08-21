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
    align-items: stretch;
    gap: 0.5rem;
    max-width: 28rem;
  }

  .ca-certificate-input {
    flex: 1 1 auto;
    min-width: 0;
    cursor: pointer;

    &:disabled {
      cursor: not-allowed;
    }
  }

  /* match the button height to the input beside it */
  .ca-certificate-select {
    display: flex;

    button {
      height: 100%;
      white-space: nowrap;
    }
  }

  .ca-certificate-remove {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    padding: 0 0.25rem;
    border: none;
    background: none;
    line-height: 0;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;

    &:hover:not(:disabled) {
      color: ${(props) => props.theme.colors.text.danger};
    }

    &:disabled {
      cursor: not-allowed;
    }
  }

  .timing-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .default-location-field {
    .settings-field-control {
      align-items: stretch;
    }

    .default-location-input {
      flex: 1 1 auto;
      min-width: 0;
    }

    /* match the Browse button's height to the input next to it */
    .default-location-browse {
      display: flex;

      button {
        height: 100%;
      }
    }
  }
`;

export default StyledWrapper;
