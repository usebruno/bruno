import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const sizeStyles = {
  xs: `
    .spinner {
      width: 0.75rem;
      height: 0.75rem;
    }
  `,
  sm: `
    .spinner {
      width: 1rem;
      height: 1rem;
    }
  `,
  md: `
    .spinner {
      width: 1.25rem;
      height: 1.25rem;
    }
  `,
  lg: `
    .spinner {
      width: 1.5rem;
      height: 1.5rem;
    }
  `,
  xl: `
    .spinner {
      width: 2rem;
      height: 2rem;
    }
  `
};

const StyledWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: ${(props) => props.theme.brand};

  ${(props) => sizeStyles[props.$size] || sizeStyles.md}

  .spinner {
    display: inline-flex;
    animation: ${spin} 0.75s linear infinite;
  }

  .spinner-text {
    font-size: 0.875rem;
    color: inherit;
  }
`;

export default StyledWrapper;
