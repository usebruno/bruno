import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${(props) => props.theme.sidebar.bg};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid ${(props) => props.theme.border.border1};
    border-top-color: ${(props) => props.theme.colors.text.yellow};
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .message {
    margin-top: 16px;
    color: ${(props) => props.theme.sidebar.color};
    font-size: 14px;
  }
`;

export default StyledWrapper;
