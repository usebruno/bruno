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
  
  /* Fixed gradient overlay that appears when content overflows */
  .scroll-indicator {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 55px; /* Position it just above the add button */
    height: 70px;
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
      bottom: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      
      .chevron-icon {
        position: relative;
        display: flex;
        justify-content: center;
        color: ${(props) => props.theme.mode === 'dark' ? '#bbb' : '#555'};
        position: absolute;
        stroke-width: 2;
        animation: pulse-top 1.5s infinite ease-in-out;
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
    }
  }

  .add-message-btn-container {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 8px 0px;
    background: ${(props) => props.theme.bg || '#fff'};
    z-index: 10;
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