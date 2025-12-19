import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  flex: 1;
  position: relative;

  .ws-message-header {
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

  .add-message-btn-container {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding-top: 8px;
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

  .ws-empty-message {
    color: ${(props) => props.theme.ws.body.emptyMessage};
  }

  .ws-add-button {
    border: 1px solid ${(props) => props.theme.ws.body.addButton.border};
    background-color: ${(props) => props.theme.ws.body.addButton.bg};
    color: ${(props) => props.theme.ws.body.addButton.text};

    &:hover {
      background-color: ${(props) => props.theme.ws.body.addButton.hoverBg};
    }
  }

  .ws-add-icon {
    color: ${(props) => props.theme.ws.body.addButton.icon};
  }

  .ws-message-container {
    border: 1px solid ${(props) => props.theme.ws.singleMessage.container.border};
    
    &.h-full {
      height: 100%;
      min-height: 0;
    }
    
    &.h-80 {
      height: 20rem;
    }
  }

  .ws-message-header {
    background-color: ${(props) => props.theme.ws.singleMessage.header.bg};
  }

  .ws-chevron-icon {
    color: ${(props) => props.theme.ws.singleMessage.icon};
  }

  .ws-action-button {
    &:hover {
      background-color: ${(props) => props.theme.ws.singleMessage.actionButton.hoverBg};
    }
  }

  .ws-action-icon {
    color: ${(props) => props.theme.ws.singleMessage.icon};
  }
`;

export default Wrapper;
