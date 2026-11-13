import styled from 'styled-components';

const StyledWrapper = styled.div`
  min-width: 0;

  .form-field-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .form-field-label {
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 500;
    color: ${(props) => props.theme.text};
    margin: 0;
  }

  .form-field-description {
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 400;
    color: ${(props) => props.theme.colors.text.muted};
    margin: 0.125rem 0 0 0;
  }

  .form-field-control {
    display: flex;
    align-items: center;
    min-width: 0;
  }

  .form-field-error {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.danger};
    margin-top: 0.25rem;
  }

  /* Label + description above the control */
  &.form-field--stacked {
    display: flex;
    flex-direction: column;

    .form-field-text + .form-field-control {
      margin-top: 0.5rem;
    }
  }

  /* Label + description left, control right-aligned and sized to its content */
  /* Fixed control column: the text column is the same width in every row, whatever the control.
     The control is centred on the label + description block. */
  &.form-field--inline {
    display: grid;
    grid-template-columns: minmax(0, 1fr) ${(props) => props.$controlWidth};
    column-gap: 1.5rem;
    align-items: center;

    .form-field-control {
      justify-self: end;
    }

    .form-field-error {
      grid-column: 1 / -1;
    }
  }

  /* Control left, label + description right; description and error line up under the label text */
  &.form-field--leading {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-areas:
      'control text'
      '. error';
    column-gap: 0.5rem;
    align-items: start;

    .form-field-text {
      grid-area: text;
    }

    /* Centre the control on the label's first line */
    .form-field-control {
      grid-area: control;
      min-height: 1.25rem;
    }

    .form-field-error {
      grid-area: error;
    }
  }
`;

export default StyledWrapper;
