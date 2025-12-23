import styled from 'styled-components';

const StyledWrapper = styled.div`
  .ws-message-container {
    border: 1px solid ${(props) => props.theme.ws.singleMessage.container.border};
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

export default StyledWrapper;
