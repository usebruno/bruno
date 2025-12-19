import styled from 'styled-components';

const StyledWrapper = styled.div`
  .ws-message-container {
    border: 1px solid ${(props) => props.theme.wsSingleMessage.container.border};
  }

  .ws-message-header {
    background-color: ${(props) => props.theme.wsSingleMessage.header.bg};
  }

  .ws-chevron-icon {
    color: ${(props) => props.theme.wsSingleMessage.icon};
  }

  .ws-action-button {
    &:hover {
      background-color: ${(props) => props.theme.wsSingleMessage.actionButton.hoverBg};
    }
  }

  .ws-action-icon {
    color: ${(props) => props.theme.wsSingleMessage.icon};
  }
`;

export default StyledWrapper;
