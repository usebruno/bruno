import styled, { css } from 'styled-components';
import { darken, lighten, rgba } from 'polished';

// adjusts the color for hover state based on the theme mode
const hoverAdjust = (color, props) => (props.theme.mode === 'dark' ? lighten(0.05, color) : darken(0.05, color));

const sizeStyles = {
  sm: css`
    --checkbox-box-size: 12px;
    --checkbox-label-size: ${(props) => props.theme.font.size.xs};
    --checkbox-border-radius: 2px;
    --checkbox-border-width: 1px;
  `,
  md: css`
    --checkbox-box-size: 14px;
    --checkbox-label-size: ${(props) => props.theme.font.size.sm};
    --checkbox-border-radius: 2px;
    --checkbox-border-width: 1px;
  `,
  lg: css`
    --checkbox-box-size: 16px;
    --checkbox-label-size: ${(props) => props.theme.font.size.base};
    --checkbox-border-radius: 4px;
    --checkbox-border-width: 1px;
  `,
  xl: css`
    --checkbox-box-size: 18px;
    --checkbox-label-size: ${(props) => props.theme.font.size.md};
    --checkbox-border-radius: 4px;
    --checkbox-border-width: 1px;
  `
};

const StyledWrapper = styled.div`
  display: inline-flex;

  ${(props) => sizeStyles[props.$size] || sizeStyles.md}

  .checkbox-root {
    cursor: ${(props) => (props.$disabled ? 'not-allowed' : 'pointer')};
    opacity: ${(props) => (props.$disabled ? 0.5 : 1)};
  }

  .checkbox-box-wrapper {
    position: relative;
    width: var(--checkbox-box-size);
    height: var(--checkbox-box-size);
    flex-shrink: 0;
  }

  .checkbox-input {
    position: absolute;
    inset: 0;
    margin: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: ${(props) => (props.$disabled ? 'not-allowed' : 'pointer')};
  }

  .checkbox-box {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--checkbox-border-radius);
    border: var(--checkbox-border-width) solid ${(props) => props.theme.border.border3};
    background-color: transparent;
    transition: background-color 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease;
    pointer-events: none;

    .checkbox-icon {
      opacity: 0;
      color: ${(props) => props.theme.button2.color.primary.text};
      transition: opacity 0.1s ease;
    }
  }

  .checkbox-input:checked + .checkbox-box,
  .checkbox-input:indeterminate + .checkbox-box {
    background-color: ${(props) => props.theme.primary.solid};
    border-color: ${(props) => props.theme.primary.solid};

    .checkbox-icon {
      opacity: 1;
    }
  }

  .checkbox-input:not(:disabled):hover + .checkbox-box {
    border-color: ${(props) => hoverAdjust(props.theme.border.border3, props)};
  }

  .checkbox-input:checked:not(:disabled):hover + .checkbox-box,
  .checkbox-input:indeterminate:not(:disabled):hover + .checkbox-box {
    background-color: ${(props) => hoverAdjust(props.theme.primary.solid, props)};
    border-color: ${(props) => hoverAdjust(props.theme.primary.solid, props)};
  }

  .checkbox-input:focus-visible + .checkbox-box {
    box-shadow: 0 0 0 2px ${(props) => rgba(props.theme.primary.solid, 0.4)};
  }

  .checkbox-label {
    font-size: var(--checkbox-label-size);
    color: ${(props) => props.theme.text};
    user-select: none;
  }
`;

export default StyledWrapper;
