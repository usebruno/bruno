import styled from 'styled-components';

const StyledWrapper = styled.div`
  .status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    height: 22px;
    background: ${(props) => props.theme.sidebar.bg};
    border-top: 1px solid ${(props) => props.theme.sidebar.dragbar};
    color: ${(props) => props.theme.sidebar.color};
    font-size: 12px;
    user-select: none;
    position: relative;
    z-index: 15;
  }

  .status-bar-section {
    display: flex;
    align-items: center;
    position: relative;
    z-index: 1;
  }

  .status-bar-group {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .status-bar-button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    color: ${(props) => props.theme.sidebar.color};
    cursor: pointer;
    opacity: 0.7;
    position: relative;
    outline: none;
  }

  .console-button-content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    position: relative;
  }

  .console-label {
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
  }

  .error-count-inline {
    font-size: 10px;
    font-weight: 600;
    color: ${(props) => props.theme.colors.text.danger};
    background: ${(props) => props.theme.colors.bg.danger}20;
    padding: 1px 4px;
    border-radius: 4px;
  }

  .status-bar-divider {
    width: 1px;
    height: 16px;
    background: ${(props) => props.theme.sidebar.dragbar};
    margin: 0 8px;
    opacity: 0.3;
  }

  .status-bar-version {
    display: flex;
    align-items: center;
    padding: 2px 6px;
    font-size: 10px;
    color: ${(props) => props.theme.sidebar.muted};
    font-family: ui-monospace, 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  }
`;

export default StyledWrapper; 