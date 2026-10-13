import styled from 'styled-components';

const StyledWrapper = styled.div`
  .description {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .warning {
    color: ${(props) => props.theme.colors.text.danger};
  }

  .textbox {
    padding: 0.2rem 0.5rem;
    outline: none;
    font-size: ${(props) => props.theme.font.size.sm};
    border-radius: ${(props) => props.theme.border.radius.sm};
    background-color: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    height: 1.875rem;

    &:focus {
      outline: none;
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    &[type='number'] {
      -moz-appearance: textfield;
      appearance: textfield;
      &::-webkit-outer-spin-button,
      &::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
    }
  }
`;

export default StyledWrapper;
