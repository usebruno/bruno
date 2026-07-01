import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  flex-grow: 1;
  padding: 0.5rem;

  .app-view-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0.25rem 0.4rem;
    font-size: 11px;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .app-view-toolbar .app-exit-btn {
    cursor: pointer;
    padding: 2px 8px;
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: 3px;
    background: transparent;
    color: ${(props) => props.theme.colors.text.muted};

    &:hover {
      color: ${(props) => props.theme.text};
      border-color: ${(props) => props.theme.text};
    }
  }

  .app-webview-container {
    flex: 1 1 0;
    min-height: 0;
    display: flex;
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: 4px;
    overflow: hidden;
    background: ${(props) => props.theme.background.surface0};
  }

  .app-webview {
    width: 100%;
    height: 100%;
    flex: 1 1 0;
    border: 0;
  }
`;

export default StyledWrapper;
