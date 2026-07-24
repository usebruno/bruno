import styled from 'styled-components';
import { transparentize } from 'polished';

const controlSize = { sm: '14px', md: '16px' };
const dotSize = { sm: '6px', md: '8px' };

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;

  .radio-group-label {
    font-weight: 500;
    color: ${(props) => props.theme.text};
    font-size: ${(props) => props.theme.font.size.base};
  }

  .radio-group-options {
    display: flex;
    flex-direction: ${(props) => (props.$orientation === 'horizontal' ? 'row' : 'column')};
    flex-wrap: wrap;
    gap: ${(props) => (props.$orientation === 'horizontal' ? '1rem' : '0.5rem')};
  }

  .radio {
    display: inline-flex;
    align-items: flex-start;
    gap: 0.5rem;
    cursor: pointer;
    user-select: none;
    color: ${(props) => props.theme.text};
    font-size: ${(props) => (props.$size === 'sm' ? props.theme.font.size.sm : props.theme.font.size.base)};

    &.disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }

  .radio-control {
    position: relative;
    box-sizing: border-box;
    flex: none;
    width: ${(props) => controlSize[props.$size]};
    height: ${(props) => controlSize[props.$size]};
    min-width: ${(props) => controlSize[props.$size]};
    min-height: ${(props) => controlSize[props.$size]};
    /* keep the control square so the input stays circular regardless of layout */
    aspect-ratio: 1 / 1;
    margin-top: 0.125rem;
  }

  .radio-input {
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    box-sizing: border-box;
    margin: 0;
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 2px solid ${(props) => props.theme.input.border};
    border-radius: 50%;
    background-color: transparent;
    cursor: inherit;
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;

    &:checked {
      border-color: ${(props) => props.theme.brand};
    }

    &:focus-visible {
      box-shadow: 0 0 0 2px ${(props) => transparentize(0.7, props.theme.brand)};
    }

    &:disabled {
      cursor: not-allowed;
    }
  }

  .radio-dot {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0);
    width: ${(props) => dotSize[props.$size]};
    height: ${(props) => dotSize[props.$size]};
    border-radius: 50%;
    background-color: ${(props) => props.theme.brand};
    transition: transform 0.15s ease;
    pointer-events: none;
  }

  .radio-input:checked ~ .radio-dot {
    transform: translate(-50%, -50%) scale(1);
  }

  .radio-text {
    display: inline-flex;
    flex-direction: column;
    line-height: 1.4;
  }

  .radio-description {
    margin-top: 0.0625rem;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;
