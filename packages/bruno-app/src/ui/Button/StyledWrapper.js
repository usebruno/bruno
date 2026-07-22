import styled, { css, keyframes } from 'styled-components';
import { darken, rgba } from 'polished';

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const sizeStyles = {
  xs: css`
    padding: 0.25rem 0.5rem;
    font-size: ${(props) => props.theme.font.size.xs};
    gap: 0.25rem;

    .button-icon {
      width: 0.75rem;
      height: 0.75rem;
    }

    .spinner-icon {
      width: 0.75rem;
      height: 0.75rem;
    }
  `,
  sm: css`
    padding: 0.375rem 0.75rem;
    font-size: ${(props) => props.theme.font.size.sm};
    gap: 0.375rem;

    .button-icon {
      width: 0.875rem;
      height: 0.875rem;
    }

    .spinner-icon {
      width: 0.875rem;
      height: 0.875rem;
    }
  `,
  base: css`
    padding: 0.5rem 1rem;
    font-size: ${(props) => props.theme.font.size.sm};
    gap: 0.5rem;

    .button-icon {
      width: 1rem;
      height: 1rem;
    }

    .spinner-icon {
      width: 1rem;
      height: 1rem;
    }
  `,
  md: css`
    padding: 0.625rem 1.125rem;
    font-size: ${(props) => props.theme.font.size.sm};
    gap: 0.5rem;

    .button-icon {
      width: 1rem;
      height: 1rem;
    }

    .spinner-icon {
      width: 1rem;
      height: 1rem;
    }
  `,
  lg: css`
    padding: 0.75rem 1.5rem;
    font-size: ${(props) => props.theme.font.size.base};
    gap: 0.75rem;

    .button-icon {
      width: 1.125rem;
      height: 1.125rem;
    }

    .spinner-icon {
      width: 1.125rem;
      height: 1.125rem;
    }
  `
};

const roundedStyles = {
  sm: css`
    border-radius: ${(props) => props.theme.border.radius.sm};
  `,
  base: css`
    border-radius: ${(props) => props.theme.border.radius.base};
  `,
  md: css`
    border-radius: ${(props) => props.theme.border.radius.md};
  `,
  lg: css`
    border-radius: ${(props) => props.theme.border.radius.lg};
  `,
  full: css`
    border-radius: 9999px;
  `
};

const fontWeightStyles = {
  regular: 400,
  medium: 500
};

// For secondary, use text color for outline/ghost; for others, use bg
const getDisplayColor = (colorConfig, colorName) => {
  return colorName === 'secondary' ? colorConfig.text : colorConfig.bg;
};

const getVariantStyles = (variant, color) => {
  if (variant === 'filled') {
    return css`
      background-color: ${(props) => props.theme.button2.color[color].bg};
      color: ${(props) => props.theme.button2.color[color].text};
      border: 1px solid ${(props) => props.theme.button2.color[color].border};

      &:disabled {
        color: ${(props) => props.theme.button2.color[color].text} !important;
      }

      &:hover:not(:disabled) {
        ${(props) => {
          return css`
            background-color: ${darken(0.03, props.theme.button2.color[color].bg)};
            border-color: ${darken(0.03, props.theme.button2.color[color].border)};
          `;
        }}
      }

      &:active:not(:disabled) {
        ${(props) => {
          const bg = props.theme.button2.color[color].bg;
          return css`
            background-color: ${darken(0.07, bg)};
          `;
        }}
      }
    `;
  }

  if (variant === 'outline') {
    return css`
      background-color: transparent;
      color: ${(props) => getDisplayColor(props.theme.button2.color[color], color)};
      border: 1px solid ${(props) => getDisplayColor(props.theme.button2.color[color], color)};

      &:hover:not(:disabled) {
        ${(props) => {
          const displayColor = getDisplayColor(props.theme.button2.color[color], color);
          return css`
            background-color: ${rgba(displayColor, 0.05)};
          `;
        }}
      }

      &:active:not(:disabled) {
        ${(props) => {
          const displayColor = getDisplayColor(props.theme.button2.color[color], color);
          return css`
            background-color: ${rgba(displayColor, 0.1)};
          `;
        }}
      }
    `;
  }

  if (variant === 'ghost') {
    return css`
      background-color: transparent;
      color: ${(props) => getDisplayColor(props.theme.button2.color[color], color)};
      border: 1px solid transparent;

      &:hover:not(:disabled) {
        ${(props) => {
          const displayColor = getDisplayColor(props.theme.button2.color[color], color);
          return css`
            background-color: ${rgba(displayColor, 0.1)};
          `;
        }}
      }

      &:active:not(:disabled) {
        ${(props) => {
          const displayColor = getDisplayColor(props.theme.button2.color[color], color);
          return css`
            background-color: ${rgba(displayColor, 0.15)};
          `;
        }}
      }
    `;
  }

  return css``;
};

const StyledWrapper = styled.div`
  display: ${(props) => (props.$fullWidth ? 'block' : 'inline-block')};
  width: ${(props) => (props.$fullWidth ? '100%' : 'auto')};

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: ${(props) => (props.$fullWidth ? '100%' : 'auto')};
    font-family: inherit;
    font-weight: ${(props) => fontWeightStyles[props.$fontWeight] || 400};
    line-height: 1;
    cursor: pointer;
    transition: all 0.15s ease;
    outline: none;
    white-space: nowrap;
    user-select: none;

    ${(props) => sizeStyles[props.$size]}
    ${(props) => roundedStyles[props.$rounded]}
    ${(props) => getVariantStyles(props.$variant, props.$color)}

    &:focus-visible {
      ${(props) => {
        const colorConfig = props.theme.button2.color[props.$color];
        const focusColor = props.$color === 'secondary' ? colorConfig.text : colorConfig.bg;
        return css`
          box-shadow: 0 0 0 2px ${rgba(focusColor, 0.4)};
        `;
      }}
    }

    &:disabled {
      cursor: not-allowed;
      pointer-events: none;
      opacity: 0.7;
    }

    .button-content {
      display: inline-flex;
      align-items: center;
    }

    .button-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      svg {
        width: 100%;
        height: 100%;
      }
    }

    .button-spinner {
      display: inline-flex;
      align-items: center;
      justify-content: center;

      .spinner-icon {
        animation: ${spin} 0.75s linear infinite;
      }
    }

  }
`;

export default StyledWrapper;
