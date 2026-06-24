import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 0.5rem;

  .app-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0.25rem 0.5rem;
    font-size: 11px;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .app-toolbar .view-toggle {
    display: flex;
    align-items: center;
    height: 24px;
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.base};
    overflow: hidden;
  }

  .app-toolbar .view-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 10px;
    height: 100%;
    border: none;
    border-right: 1px solid ${(props) => props.theme.input.border};
    background: transparent;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
    font-size: 11px;

    &:last-child { border-right: none; }

    &:hover:not(.active) {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      color: ${(props) => props.theme.text};
    }

    &.active {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      color: ${(props) => props.theme.primary.text};
    }
  }

  .app-pane {
    flex: 1 1 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .app-pane.code div.CodeMirror {
    height: 100%;
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
