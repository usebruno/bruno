import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  flex: 1;
  /* height: 100%; */
  position: relative;

  .ws-message-header {
    .font-medium {
      color: ${props => props.theme.text};
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
    /* height: 100%; */
    position: relative;
  }
  
  .add-message-btn-container {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding-top: 8px;
    background: ${props => props.theme.bg || '#fff'};
    z-index: 15;
    border-top: 1px solid ${props => props.theme.border || 'rgba(0, 0, 0, 0.1)'};
    
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
