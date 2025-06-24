import styled from 'styled-components';

const StyledWrapper = styled.div`
  margin: -1.5rem -1rem;
  height: 50vh;
  display: flex;
  flex-direction: column;
  background-color: ${(props) => props.theme.collection.environment.settings.bg};

  .code-generator {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .editor-container {
    flex: 1;
    overflow: hidden;
    position: relative;
    background: ${props => props.theme.bg};
  }

  .error-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: ${props => props.theme.colors.text.muted};
    text-align: center;
    padding: 20px;

    h1 {
      font-size: 14px;
      margin-bottom: 8px;
      color: ${props => props.theme.text};
    }

    p {
      font-size: 12px;
      opacity: 0.8;
    }
  }
`;

export default StyledWrapper;
