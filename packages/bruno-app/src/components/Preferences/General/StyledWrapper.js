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
  }

  .timing-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
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
