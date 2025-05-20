import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  flex: 1;
  height: 100%;
  position: relative;

  .grpc-message-header {
    .font-medium {
      color: ${(props) => props.theme.text};
    }
    
    button {
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      
      &:hover {
        transform: scale(1.1);
      }
      
      &:active {
        transform: scale(0.95);
      }
    }
  }

  #grpc-messages-container {
    max-height: calc(100vh - 250px);
    overflow-y: auto;
    &::-webkit-scrollbar {
      display: none;
    }

    scrollbar-width: none;
    position: relative;
  }
  
  .scroll-indicator {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0px; /* Position it just above the add button */
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
      bottom:75px;
      display: flex;
      justify-content: center;
      align-items: center;
      
      .chevron-icon {
        position: relative;
        display: flex;
        justify-content: center;
        color: ${(props) => props.theme.text};
        position: absolute;
        stroke-width: 2;
        animation: pulse-top 1.5s infinite ease-in-out;
      }

      .mouse-scroll-indicator {
        position: relative;
        display: flex;
        justify-content: center;
        color: ${(props) => props.theme.text};
        
        .animated-mouse-icon {
          position: relative;
          animation: mouse-bounce 1.5s infinite ease-in-out;
        }
        
        .scroll-wheel-animation {
          animation: scroll-wheel 1.5s infinite ease-in-out;
          transform-origin: center;
        }
      }

      @keyframes pulse-top {
        0% {
          transform: translateY(-4px);
        }
        50% {
          transform: translateY(2px);
        }
        100% {
          transform: translateY(-4px);
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

  .add-message-btn-container {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 8px 0px;
    background: ${(props) => props.theme.bg || '#fff'};
    z-index: 15;
    border-top: 1px solid ${(props) => props.theme.border || 'rgba(0, 0, 0, 0.1)'};
    
    .add-message-btn {
      width: 100%;
    }
  }

  .CodeMirror {
    border-top: 0;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }
`;

export default Wrapper;