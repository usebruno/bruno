import styled from 'styled-components';

const StyledWrapper = styled.div`
  .sandbox-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.375rem;
    height: 1.375rem;
    border-radius: ${(props) => props.theme.border.radius.base};
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      opacity: 0.8;
    }
  }

  .safe-mode {
    background-color: ${(props) => props.theme.app.collection.toolbar.sandboxMode.safeMode.bg};
    color: ${(props) => props.theme.app.collection.toolbar.sandboxMode.safeMode.color};
  }

  .developer-mode {
    background-color: ${(props) => props.theme.app.collection.toolbar.sandboxMode.developerMode.bg};
    color: ${(props) => props.theme.app.collection.toolbar.sandboxMode.developerMode.color};
  }
`;

export default StyledWrapper;
