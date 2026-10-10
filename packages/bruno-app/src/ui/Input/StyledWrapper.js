import styled, { css } from 'styled-components';
import { INPUT_SIZES } from '../InputWrapper/constants';

// Sizes come from the same table as Select, so inputs and dropdowns line up in a form. The line
// height is part of the size: it is what makes the box as tall as a Select trigger (about 33px at md).
const LINE_HEIGHT = '1.42857143';

const getSize = (props) => INPUT_SIZES[props.$size] || INPUT_SIZES.md;

const disabledBg = (theme) => (theme.mode === 'dark' ? theme.background.surface0 : theme.background.mantle);

const StyledWrapper = styled.div`
  display: ${(props) => (props.$fullWidth ? 'flex' : 'inline-flex')};
  width: ${(props) => (props.$fullWidth ? '100%' : 'auto')};
  align-items: center;
  gap: 0.375rem;
  box-sizing: border-box;
  padding: ${(props) => getSize(props).padding};
  border: 1px solid ${(props) => props.theme.input.border};
  border-radius: ${(props) => props.theme.border.radius[getSize(props).borderRadius]};
  background-color: ${(props) => props.theme.input.bg};
  color: ${(props) => props.theme.text};
  font-size: ${(props) => props.theme.font.size[getSize(props).fontSize]};
  line-height: ${LINE_HEIGHT};
  transition: border-color 0.15s ease;

  &:focus-within {
    border-color: ${(props) => props.theme.input.focusBorder};
  }

  /* Ghost comes before error so an errored cell still shows the danger border. */
  ${(props) =>
    props.$ghost
    && css`
      padding: 0;
      line-height: 1;
      border-color: transparent;
      background-color: transparent;
      border-radius: 0;

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
    gap: 0.25rem;
    pointer-events: ${(props) => props.$rightSectionPointerEvents};
  }
`;

export default StyledWrapper;
