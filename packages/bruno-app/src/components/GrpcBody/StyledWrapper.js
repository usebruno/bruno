import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow: hidden;

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

  .CodeMirror {
    border-top: 0;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }
`;

export default Wrapper;