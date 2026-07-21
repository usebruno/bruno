import styled, { css } from 'styled-components';
import { transparentize } from 'polished';

const sizeStyles = {
  sm: css`
    .segment {
      padding: 0.25rem 0.625rem;
      font-size: ${(props) => props.theme.font.size.sm};
    }
  `,
  md: css`
    .segment {
      padding: 0.375rem 0.875rem;
      font-size: ${(props) => props.theme.font.size.base};
    }
  `,
  lg: css`
    .segment {
      padding: 0.5rem 1.125rem;
      font-size: ${(props) => props.theme.font.size.md};
    }
  `
};

const StyledWrapper = styled.div`
  display: ${(props) => (props.$fullWidth ? 'flex' : 'inline-flex')};
  width: ${(props) => (props.$fullWidth ? '100%' : 'auto')};
  border: 1px solid ${(props) => props.theme.input.border};
  border-radius: ${(props) => props.theme.border.radius.md};
  overflow: hidden;
  background: ${(props) => props.theme.input.bg};

  .segment {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    line-height: 1;
    flex: ${(props) => (props.$fullWidth ? '1 1 0' : '0 0 auto')};
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
    color: ${(props) => props.theme.colors.text.muted};
    transition: background 0.15s ease, color 0.15s ease;
  }

  .segment-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .segment-icon svg {
    display: block;
  }

  .segment + .segment {
    border-left: 1px solid ${(props) => props.theme.input.border};
  }

  .segment:hover:not(.active):not(.disabled) {
    color: ${(props) => props.theme.text};
    background: ${(props) => props.theme.dropdown.hoverBg};
  }

  .segment.active {
    color: ${(props) => props.theme.brand};
    background: ${(props) => transparentize(0.88, props.theme.brand)};
    font-weight: 500;
  }

  .segment.disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  /* focus ring only for keyboard focus (not mouse clicks); the input covers
     the segment, so its outline frames the segment */
  .segment-input:focus-visible {
    outline: 2px solid ${(props) => transparentize(0.4, props.theme.brand)};
    outline-offset: -2px;
  }

  ${(props) => sizeStyles[props.$size]}

  /* Real radio input: covers the whole segment, transparent but clickable and
     focusable — keeps keyboard nav, screen-reader semantics, and testability. */
  .segment-input {
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    opacity: 0;
    cursor: inherit;
  }
`;

export default StyledWrapper;
