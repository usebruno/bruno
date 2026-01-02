import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 50vh;
  display: flex;
  flex-direction: column;
  background-color: ${(props) => props.theme.modal.bg};

  .code-generator {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .editor-container {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    position: relative;
    background: ${(props) => props.theme.modal.bg};
    margin-top: 0.5rem;
  }

  .error-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: ${(props) => props.theme.colors.text.muted};
    text-align: center;
    padding: 20px;

    h1 {
      font-size: ${(props) => props.theme.font.size.base};
      margin-bottom: 8px;
      color: ${(props) => props.theme.text};
    }

    p {
      font-size: ${(props) => props.theme.font.size.sm};
      opacity: 0.8;
    }
  }
`;

export default StyledWrapper;
