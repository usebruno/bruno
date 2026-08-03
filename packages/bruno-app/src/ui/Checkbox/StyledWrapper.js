import styled, { css } from 'styled-components';
import { darken, rgba } from 'polished';

// theme.primary.solid is each theme's brand color (equals #D37F17 on light,
// #E4AE49 on dark) -- same value as button2.color.primary.bg in every theme,
// but this is the canonical token for it. button2.color.primary.text is kept
// for the icon since it's already tuned per theme for contrast against that bg
// (white on most, black-ish on themes with a lighter primary, e.g. dark/dark-pastel/nord).
const getCheckedBg = (props) => props.theme.primary.solid;
const getCheckIconColor = (props) => props.theme.button2.color.primary.text;

const sizeStyles = {
  sm: css`
    --checkbox-box-size: 12px;
    --checkbox-border-radius: 2px;
    --checkbox-border-width: 1px;
  `,
  md: css`
    --checkbox-box-size: 14px;
    --checkbox-border-radius: 4px;
    --checkbox-border-width: 2px;
  `,
  lg: css`
    --checkbox-box-size: 16px;
    --checkbox-border-radius: 4px;
    --checkbox-border-width: 2px;
  `,
  xl: css`
    --checkbox-box-size: 18px;
    --checkbox-border-radius: 4px;
    --checkbox-border-width: 2px;
  `
};

const StyledWrapper = styled.div`
  display: inline-flex;

  ${(props) => sizeStyles[props.$size]}

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
      color: ${(props) => getCheckIconColor(props)};
      transition: opacity 0.1s ease;
    }
  }

  .checkbox-input:checked + .checkbox-box,
  .checkbox-input:indeterminate + .checkbox-box {
    background-color: ${(props) => getCheckedBg(props)};
    border-color: ${(props) => getCheckedBg(props)};

    .checkbox-icon {
      opacity: 1;
    }
  }

  .checkbox-input:not(:disabled):hover + .checkbox-box {
    border-color: ${(props) => darken(0.05, props.theme.border.border3)};
  }

  .checkbox-input:checked:not(:disabled):hover + .checkbox-box,
  .checkbox-input:indeterminate:not(:disabled):hover + .checkbox-box {
    background-color: ${(props) => darken(0.05, getCheckedBg(props))};
    border-color: ${(props) => darken(0.05, getCheckedBg(props))};
  }

  .checkbox-input:focus-visible + .checkbox-box {
    box-shadow: 0 0 0 2px ${(props) => rgba(getCheckedBg(props), 0.4)};
  }

  .checkbox-label {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.text};
    user-select: none;
  }
`;

export default StyledWrapper;
