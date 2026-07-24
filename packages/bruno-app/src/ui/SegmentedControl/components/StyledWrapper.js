import styled, { css } from 'styled-components';
import { transparentize } from 'polished';

// Recessed track behind the segments and the raised "tile" behind the active
// segment, sourced from the theme's surface scale. In light themes the tile is
// the lightest surface (base) on a greyer track; in dark themes the tile is a
// lighter surface raised above a darker track.
const trackBg = (theme) =>
  (theme.mode === 'dark' ? theme.background?.surface0 : theme.background?.crust) || theme.bg;

const tileBg = (theme) =>
  (theme.mode === 'dark' ? theme.background?.surface2 : theme.background?.base) || theme.bg;

// Two looks for the container and the active segment:
//  - solid    (default): recessed track with a raised, surface-filled tile.
//  - outlined: transparent, bordered container with a brand-tinted active tile.
const variantStyles = {
  solid: css`
    background: ${(props) => trackBg(props.theme)};

    .segment.active {
      color: ${(props) => props.theme.brand};
      background: ${(props) => tileBg(props.theme)};
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
      font-weight: 500;
    }
  `,
  outlined: css`
    background: transparent;
    border: 1px solid ${(props) => props.theme.border.border1};
    /* segments butt up against each other, separated by dividers and filling
       the full cell (no inset tile), so drop the track padding and gap. */
    padding: 0;
    gap: 0;

    .segment {
      border-radius: 0;
    }

    /* vertical divider between segments */
    .segment:not(:last-child) {
      border-right: 1px solid ${(props) => props.theme.border.border1};
    }

    /* round the end segments so the active fill matches the container corners */
    .segment:first-child {
      border-top-left-radius: calc(${(props) => props.theme.border.radius.md} - 1px);
      border-bottom-left-radius: calc(${(props) => props.theme.border.radius.md} - 1px);
    }
    .segment:last-child {
      border-top-right-radius: calc(${(props) => props.theme.border.radius.md} - 1px);
      border-bottom-right-radius: calc(${(props) => props.theme.border.radius.md} - 1px);
    }

    .segment.active {
      color: ${(props) => props.theme.brand};
      background: ${(props) => transparentize(0.88, props.theme.brand)};
      box-shadow: none;
      font-weight: 500;
    }
  `
};

const sizeStyles = {
  sm: css`
    .segment {
      padding: 0.1875rem 0.625rem;
      font-size: ${(props) => props.theme.font.size.sm};
    }
  `,
  md: css`
    .segment {
      padding: 0.3125rem 0.875rem;
      font-size: ${(props) => props.theme.font.size.base};
    }
  `,
  lg: css`
    .segment {
      padding: 0.4375rem 1.125rem;
      font-size: ${(props) => props.theme.font.size.md};
    }
  `
};

const StyledWrapper = styled.div`
  display: ${(props) => (props.$fullWidth ? 'flex' : 'inline-flex')};
  width: ${(props) => (props.$fullWidth ? '100%' : 'auto')};
  gap: 2px;
  padding: 3px;
  border-radius: ${(props) => props.theme.border.radius.md};

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
    border-radius: ${(props) => props.theme.border.radius.sm};
    color: ${(props) => props.theme.colors.text.muted};
    background: transparent;
    transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
  }

  .segment-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .segment-icon svg {
    display: block;
  }

  .segment:hover:not(.active):not(.disabled) {
    color: ${(props) => props.theme.text};
  }

  .segment.disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  ${(props) => variantStyles[props.$variant] || variantStyles.solid}
  ${(props) => sizeStyles[props.$size]}

  /* focus ring only for keyboard focus (not mouse clicks); the input covers
     the segment, so its outline frames the segment */
  .segment-input:focus-visible {
    outline: 2px solid ${(props) => transparentize(0.4, props.theme.brand)};
    outline-offset: 1px;
  }

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
