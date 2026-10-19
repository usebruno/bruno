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
    width: ${(props) => (props.$determinate ? `${(props.$progress ?? 0) * 100}%` : '30%')};
    background: ${(props) => (props.$determinate
      ? props.theme.colors.accent
      : `linear-gradient(
      90deg,
      transparent,
      ${props.theme.textLink},
      transparent
    )`)};
    animation: ${(props) => (props.$determinate ? 'none' : 'sweep 1.15s ease-in-out infinite')};
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
      width: ${(props) => (props.$determinate ? `${(props.$progress ?? 0) * 100}%` : '100%')};
      animation: none;
      opacity: ${(props) => (props.$determinate ? 1 : 0.35)};
    }
  }
`;

export default StyledWrapper;
