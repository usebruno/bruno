import styled from 'styled-components';

const Wrapper = styled.div`
  ol[role="tree"] {
    overflow: hidden;
  }
  ol[role="group"] span {
    line-break: anywhere;
  }

  .token-section {
    border-color: ${(props) => props.theme.oauth2TokenViewer.section.border};
  }

  .token-header {
    background-color: ${(props) => props.theme.oauth2TokenViewer.header.bg};
    
    &:hover {
      background-color: ${(props) => props.theme.oauth2TokenViewer.header.hoverBg};
    }
  }

  .token-copy-button {
    background-color: ${(props) => props.theme.oauth2TokenViewer.copyButton.bg};
    
    &:hover {
      background-color: ${(props) => props.theme.oauth2TokenViewer.copyButton.hoverBg};
    }
  }

  .token-content {
    background-color: ${(props) => props.theme.oauth2TokenViewer.content.bg};
  }

  .token-label {
    color: ${(props) => props.theme.oauth2TokenViewer.label};
  }

  .token-value {
    color: ${(props) => props.theme.oauth2TokenViewer.value};
  }

  .token-expiry {
    &.expiring {
      background-color: ${(props) => props.theme.oauth2TokenViewer.expiry.expiring.bg};
      color: ${(props) => props.theme.oauth2TokenViewer.expiry.expiring.text};
    }

    &:not(.expiring) {
      background-color: ${(props) => props.theme.oauth2TokenViewer.expiry.normal.bg};
      color: ${(props) => props.theme.oauth2TokenViewer.expiry.normal.text};
    }
  }

  .token-error {
    color: ${(props) => props.theme.oauth2TokenViewer.error.text};
  }

  .token-info-container {
    border-color: ${(props) => props.theme.oauth2TokenViewer.infoContainer.border};
  }

  .token-info-section {
    background-color: ${(props) => props.theme.oauth2TokenViewer.infoSection.bg};
  }

  .token-empty {
    color: ${(props) => props.theme.oauth2TokenViewer.empty};
  }
`;

export default Wrapper;
