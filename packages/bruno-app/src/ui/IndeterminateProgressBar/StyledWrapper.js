import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: relative;
  height: 2px;
  width: 100%;
  overflow: hidden;
  flex-shrink: 0;

  .bar {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 30%;
    background: linear-gradient(
      90deg,
      transparent,
      ${(props) => props.theme.textLink},
      transparent
    );
    animation: sweep 1.15s ease-in-out infinite;
  }

  @keyframes sweep {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(333%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .bar {
      width: 100%;
      animation: none;
      opacity: 0.35;
    }
  }
`;

export default StyledWrapper;
