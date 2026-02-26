import styled, { css } from 'styled-components';

const sizeMap = {
  xs: 20,
  sm: 22,
  md: 24,
  lg: 28,
  xl: 32
};

const variants = {
  subtle: css`
    color: ${(props) => props.theme.colors.text.muted};
    background: transparent;
    &:hover:not(:disabled) {
      color: ${(props) => props.theme.text};
      background: ${(props) => props.theme.dropdown.hoverBg};
    }
  `
};

const StyledWrapper = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 0;

  width: ${(props) => sizeMap[props.$size] || props.$size}px;
  height: ${(props) => sizeMap[props.$size] || props.$size}px;

  ${(props) => variants[props.$variant] || variants.subtle}

  ${(props) => props.$color && css`
    color: ${props.$color};
  `}

  svg {
    /* stroke: currentColor; */
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  ${(props) => props.$colorOnHover && css`
    &:hover:not(:disabled) {
      color: ${props.$colorOnHover};
    }
  `}
`;

export default StyledWrapper;
