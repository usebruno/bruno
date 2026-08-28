import styled, { css } from 'styled-components';

const disabledBg = (theme) => (theme.mode === 'dark' ? theme.background.surface0 : theme.background.mantle);

const StyledWrapper = styled.div`
  display: ${(props) => (props.$fullWidth ? 'flex' : 'inline-flex')};
  width: ${(props) => (props.$fullWidth ? '100%' : 'auto')};
  align-items: center;
  gap: 0.375rem;
  box-sizing: border-box;
  padding: 0.375rem 0.5rem;
  border: 1px solid ${(props) => props.theme.input.border};
  border-radius: ${(props) => props.theme.border.radius.base};
  background-color: ${(props) => props.theme.input.bg};
  color: ${(props) => props.theme.text};
  font-size: ${(props) => props.theme.font.size.sm};
  line-height: 1;
  transition: border-color 0.15s ease;

  &:focus-within {
    border-color: ${(props) => props.theme.input.focusBorder};
  }

  /* Ghost comes before error so an errored cell still shows the danger border. */
  ${(props) =>
    props.$ghost
    && css`
      padding: 0;
      border-color: transparent;
      background-color: transparent;
      border-radius: 0;

      /*
       * Deliberately no focus border: a ghost input shares a table row with
       * SingleLineEditor cells, which show no focus ring either. Matching them is the
       * whole point of the variant — see EditableTable/StyledWrapper.js.
       */
      &:focus-within {
        border-color: transparent;
      }
    `}

  ${(props) =>
    props.$error
    && css`
      border-color: ${props.theme.status.danger.border};

      &:focus-within {
        border-color: ${props.theme.status.danger.border};
      }
    `}

  ${(props) =>
    props.$disabled
    && css`
      background-color: ${disabledBg(props.theme)};
      cursor: not-allowed;
    `}

  .input-control {
    flex: 1 1 auto;
    min-width: 0;
    padding: 0;
    border: none;
    outline: none;
    background: transparent;
    color: inherit;
    font: inherit;

    &::placeholder {
      color: ${(props) => props.theme.input.placeholder.color};
      opacity: ${(props) => props.theme.input.placeholder.opacity};
    }

    &:disabled {
      cursor: not-allowed;
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

  ${(props) =>
    props.$ghost
    && css`
      .input-control::placeholder {
        color: ${props.theme.codemirror.placeholder.color};
        opacity: ${props.theme.codemirror.placeholder.opacity};
      }
    `}

  .input-section {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: ${(props) => props.theme.colors.text.muted};

    svg {
      width: 0.875rem;
      height: 0.875rem;
    }
  }

  .input-section-left {
    pointer-events: ${(props) => props.$leftSectionPointerEvents};
  }

  .input-section-right {
    pointer-events: ${(props) => props.$rightSectionPointerEvents};
  }


  .input-visibility-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: ${(props) => props.theme.border.radius.sm};
    color: ${(props) => props.theme.colors.text.muted};
    transition: color 0.15s ease;

    &:hover:not(:disabled) {
      color: ${(props) => props.theme.text};
    }

    &:disabled {
      cursor: not-allowed;
    }
  }
`;

export default StyledWrapper;
