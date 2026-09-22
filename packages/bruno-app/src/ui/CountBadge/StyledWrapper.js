import styled, { css } from 'styled-components';
import { rgba } from 'polished';

/** Variants: default (neutral surface), danger (status.danger), warning (brand tint, not status.warning). */
const getVariantStyles = (props) => {
  const { theme, $variant } = props;

  switch ($variant) {
    case 'danger':
      return css`
        background-color: ${theme.status.danger.background};
        color: ${theme.status.danger.text};
        border: none;
      `;
    case 'warning':
      return css`
        background-color: ${rgba(theme.brand, 0.1)};
        color: ${theme.brand};
        border: none;
      `;
    case 'default':
    default:
      return css`
        background-color: ${theme.background.surface0};
        color: ${theme.text};
        border: 1px solid ${theme.border.border1};
      `;
  }
};

/**
 * Size presets.
 *
 * - sm: 16px badge, 3px horizontal padding, radius.sm (4px)
 * - md: 20px badge, 4px horizontal padding, radius.base (6px)
 */
const getSizeStyles = (props) => {
  const { theme, $size } = props;

  switch ($size) {
    case 'md':
      return css`
        min-width: 20px;
        min-height: 20px;
        padding: 0 4px;
        border-radius: ${theme.border.radius.base};
      `;
    case 'sm':
    default:
      return css`
        min-width: ${theme.font.size.lg};
        min-height: ${theme.font.size.lg};
        padding: 0 3px;
        border-radius: ${theme.border.radius.sm};
      `;
  }
};

const StyledWrapper = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: ${(props) => props.theme.font.size.xs};
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  ${(props) => getSizeStyles(props)}
  ${(props) => getVariantStyles(props)}
`;

export default StyledWrapper;
