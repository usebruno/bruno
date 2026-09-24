import styled, { css } from 'styled-components';

const methodColor = (props) => {
  const method = props.$method;
  return props.theme.request.methods[method] || props.theme.colors.text.muted;
};

const sizeStyles = {
  md: css`
    display: inline-block;
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 600;
    text-transform: uppercase;
    width: 52px;
    flex-shrink: 0;
    text-align: left;
  `,
  sm: css`
    font-size: 9px;
    font-weight: 600;
    font-family: monospace;
    padding: 0.05rem 0.25rem;
    border-radius: 3px;
    text-transform: uppercase;
    flex-shrink: 0;
  `
};

const StyledWrapper = styled.span`
  color: ${methodColor};
  ${(props) => sizeStyles[props.$size] || sizeStyles.md}
`;

export default StyledWrapper;
