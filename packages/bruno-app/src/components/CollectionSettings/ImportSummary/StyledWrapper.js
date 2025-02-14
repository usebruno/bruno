import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: relative;
  height: 100%;

  &.dragging {
    cursor: col-resize;
    user-select: none;
    
    * {
      user-select: none;
    }
  }

  .dragbar {
    width: 5px;
    margin: 0 -2px;
    cursor: col-resize;
    position: relative;
    z-index: 10;

    &:hover .dragbar-inner,
    &:active .dragbar-inner {
      background: ${props => props.theme.requestTabPanel.dragbar.activeBorder};
    }
  }

  .dragbar-inner {
    width: 1px;
    height: 100%;
    background: ${props => props.theme.requestTabPanel.dragbar.border};
    margin: 0 auto;
    transition: background 0.2s ease;
  }

  .script-tabs {
    border-bottom: 1px solid ${props => props.theme.requestTabs.bottomBorder};
    margin-bottom: 16px;
    
    .tab {
      padding: 8px 16px;
      cursor: pointer;
      color: ${props => props.theme.requestTabs.color};
      border-bottom: 2px solid transparent;
      font-size: 13px;

      &:hover {
        color: ${props => props.theme.requestTabs.icon.hoverColor};
        background: ${props => props.theme.requestTabs.icon.hoverBg};
      }

      &.active {
        color: ${props => props.theme.tabs.active.color};
        border-bottom: 2px solid ${props => props.theme.tabs.active.border};
      }
    }
  }

  pre {
    background: ${props => props.theme.codemirror.bg};
    color: ${props => props.theme.requestTabs.color};
    padding: 16px;
    border-radius: 4px;
    font-family: Monaco, Consolas, monospace;
    font-size: 13px;
    line-height: 1.5;
    overflow-x: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .tabs {
    border-bottom: 1px solid ${props => props.theme.requestTabs.bottomBorder};
    
    .tab {
      padding: 8px 16px;
      cursor: pointer;
      color: ${props => props.theme.requestTabs.color};
      border-bottom: 2px solid transparent;
      font-size: 13px;

      &:hover {
        color: ${props => props.theme.requestTabs.icon.hoverColor};
        background: ${props => props.theme.requestTabs.icon.hoverBg};
      }

      &.active {
        color: ${props => props.theme.tabs.active.color};
        border-bottom: 2px solid ${props => props.theme.tabs.active.border};
      }
    }
  }

  .diff-viewer-container {
    margin-top: 16px;
    border: 1px solid ${props => props.theme.codemirror.border};
    border-radius: 4px;
  }

  table {
    thead,
    td {
      border: 1px solid ${(props) => props.theme.table.border};

      li {
        background-color: ${(props) => props.theme.bg} !important;
      }
    }
  }

  .muted {
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;
