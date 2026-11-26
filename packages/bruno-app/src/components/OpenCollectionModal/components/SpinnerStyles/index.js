import { css, keyframes } from 'styled-components';

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const spinnerStyles = css`
  animation: ${spin} 0.9s linear infinite;
`;

export default spinnerStyles;
