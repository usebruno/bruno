import styled from 'styled-components';
import { INPUT_SIZES } from 'ui/InputWrapper';

const StyledWrapper = styled.div`
  .text-input-wrapper {
    display: flex;
    align-items: center;
    width: 100%;
    padding: ${(props) => INPUT_SIZES[props.$size || 'md'].padding};
    font-size: ${(props) => props.theme.font.size[INPUT_SIZES[props.$size || 'md'].fontSize]};
    border-radius: ${(props) => props.theme.border.radius[INPUT_SIZES[props.$size || 'md'].borderRadius]};

    &.text-input-focused {
      border-color: ${(props) => props.theme.input.focusBorder} !important;
    }

    &.text-input-error {
      border-color: ${(props) => props.theme.colors.text.danger} !important;
    }

    &.text-input-disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  .text-input-left-section {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    margin-right: 0.5rem;
  }

  .text-input-field {
    outline: none;
    width: 100%;
    background: transparent;
    border: none;
    font-size: inherit;
    font-family: inherit;
    color: inherit;
    padding: 0;

    &:disabled {
      cursor: not-allowed;
    }
  }

  .text-input-right-section {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    margin-left: 0.5rem;
  }
`;

export default StyledWrapper;
