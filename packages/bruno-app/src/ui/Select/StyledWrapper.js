import styled, { keyframes } from 'styled-components';
import { INPUT_SIZES } from 'ui/InputWrapper/constants';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const StyledWrapper = styled.div`
  position: relative;
  width: 100%;

  .select-trigger {
    display: flex;
    align-items: center;
    width: 100%;
    cursor: pointer;
    user-select: none;
    padding: ${(props) => INPUT_SIZES[props.$size || 'md'].padding};
    font-size: ${(props) => props.theme.font.size[INPUT_SIZES[props.$size || 'md'].fontSize]};
    border-radius: ${(props) => props.theme.border.radius[INPUT_SIZES[props.$size || 'md'].borderRadius]};

    &.disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    &.select-open {
      border: solid 1px ${(props) => props.theme.input.focusBorder} !important;
    }
  }

  .select-trigger-content {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
  }

  .select-trigger-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .select-trigger-placeholder {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: 0.5;
  }

  .select-section {
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  .select-left-section {
    margin-right: 0.5rem;
  }

  .select-right-section {
    margin-left: 0.5rem;
    opacity: 0.6;
  }

  .select-caret {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    margin-left: 0.5rem;
    opacity: 0.6;

    svg {
      fill: currentColor;
    }
  }

  .select-clear {
    background: none;
    border: none;
    padding: 0;
    color: inherit;
    font: inherit;
    cursor: pointer;
    opacity: 0.4;
    transition: opacity 0.15s ease;

    &:hover {
      opacity: 0.8;
    }
  }

  .select-spinner {
    animation: ${spin} 0.75s linear infinite;
  }

  .select-search-input {
    border: none;
    outline: none;
    background: transparent;
    width: 100%;
    font-size: inherit;
    font-family: inherit;
    color: inherit;
    padding: 0;

    &::placeholder {
      opacity: 0.5;
    }
  }

  .select-nothing-found {
    padding: 0.5rem 0.625rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
  }

`;

export default StyledWrapper;
