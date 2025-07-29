import styled from 'styled-components';

const StyledWrapper = styled.div`
  border-left: 4px solid ${(props) => props.theme.colors.text.danger};
  border-top: 1px solid transparent;
  border-right: 1px solid transparent;
  border-bottom: 1px solid transparent;
  border-radius: 0.375rem;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  max-height: 200px;
  min-height: 70px;
  overflow-y: auto;
  background-color: ${(props) => (props.theme.bg === '#1e1e1e' ? 'rgba(40, 40, 40, 0.5)' : 'rgba(250, 250, 250, 0.9)')};

  .close-button {
    opacity: 0.7;
    transition: opacity 0.2s;

    &:hover {
      opacity: 1;
    }

    svg {
      color: ${(props) => props.theme.text};
    }
  }

  .error-title {
    font-weight: 600;
    margin-bottom: 0.375rem;
    color: ${(props) => props.theme.colors.text.danger};
  }

  .error-message {
    font-family: monospace;
    font-size: 0.6875rem;
    line-height: 1.25rem;
    white-space: pre-wrap;
    word-break: break-all;
    color: ${(props) => props.theme.text};
  }
`;

export default StyledWrapper;
