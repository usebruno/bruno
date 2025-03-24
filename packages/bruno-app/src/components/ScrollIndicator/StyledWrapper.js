import styled from 'styled-components';

const StyledWrapper = styled.div`
  .scroll-indicator {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0px;
    height: 125px;
    background: linear-gradient(to bottom, rgba(255,255,255,0), ${(props) => props.theme.mode === 'dark' ? props.theme.bg || '#111' : props.theme.bg || '#fff'} 85%);
    pointer-events: none;
    opacity: 0;
    z-index: 15;
    transition: opacity 0.2s ease;
    
    &.visible {
      opacity: 1;
    }

    .chevron-container {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 75px;
      display: flex;
      justify-content: center;
      align-items: center;

      .mouse-scroll-indicator {
        position: relative;
        display: flex;
        justify-content: center;
        color: ${(props) => props.theme.text};
        
        .animated-mouse-icon {
          position: relative;
          animation: mouse-bounce 1.5s 5 ease-in-out;
        }
        
        .scroll-wheel-animation {
          animation: scroll-wheel 1.5s 5 ease-in-out;
          transform-origin: center;
        }
      }

      @keyframes mouse-bounce {
        0% {
          transform: translateY(-2px);
        }
        50% {
          transform: translateY(1px);
        }
        100% {
          transform: translateY(-2px);
        }
      }
      
      @keyframes scroll-wheel {
        0% {
          transform: translateY(0);
          opacity: 1;
        }
        40% {
          transform: translateY(3px);
          opacity: 0.6;
        }
        60% {
          transform: translateY(4px);
          opacity: 0.4;
        }
        80% {
          transform: translateY(5px);
          opacity: 0.2;
        }
        100% {
          transform: translateY(6px);
          opacity: 0;
        }
      }
    }
  }
`;

export default StyledWrapper; 