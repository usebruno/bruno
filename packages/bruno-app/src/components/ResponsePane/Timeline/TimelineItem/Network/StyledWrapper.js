import styled from 'styled-components';

const StyledWrapper = styled.div`
  .network-logs-container {
    background: ${(props) => props.theme.codemirror.bg};
    color: ${(props) => props.theme.text};
    border-radius: 4px;
    overflow: auto;
    height: ${(props) => props.height || '24rem'};
    padding: ${(props) => (props.padding ? '0.5rem' : '0')};
  }

  .network-logs-pre {
    white-space: pre-wrap;
    font-size: ${(props) => (props.fontVariant === 'small' ? props.theme.font.size.xs : props.theme.font.size.base)};
    font-family: var(--font-family-mono);
  }

  .network-logs-entry {
    color: ${(props) => props.theme.colors.text.muted};

    &-request {
      color: ${(props) => props.theme.request.methods.post};
    }

    &-response {
      color: ${(props) => props.theme.request.methods.get};
    }
    
    &-error {
      color: ${(props) => props.theme.requestTabPanel.responseError};
    }

    &-tls {
      color: ${(props) => props.theme.colors.text.purple};
    }
    
    &-info {
      color: ${(props) => props.theme.colors.text.warning};
    }   
  }

  .network-logs-separator {
    border-top: 2px solid ${(props) => props.theme.border.border1};
    width: 100%;
    margin: 0.5rem 0;
  }

  .network-logs-spacing {
    margin-top: 1rem;
  }
`;

export default StyledWrapper;
