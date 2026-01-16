import styled from 'styled-components';

const StyledWrapper = styled.div`
  max-height: 200px;
  min-height: 70px;
  overflow-y: auto;
  background-color: ${(props) => props.theme.background.base};
  border: solid 1px ${(props) => props.theme.border.border2};
  border-left: 4px solid ${(props) => props.theme.colors.text.danger};
  border-radius: ${(props) => props.theme.border.radius.base};
  
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
    font-weight: 500;
    margin-bottom: 0.375rem;
    color: ${(props) => props.theme.colors.text.danger};
  }
  
  .error-message {
    font-family: monospace;
    font-size: ${(props) => props.theme.font.size.xs};
    line-height: 1.25rem;
    white-space: pre-wrap;
    word-break: break-all;
    color: ${(props) => props.theme.text};
  }

  .separator {
    border-top: 1px solid ${(props) => props.theme.border.border1};
  }
`;
export default StyledWrapper;
