import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  color: ${(props) => props.theme.text};

  .xterm-rows {
    color: ${(props) => props.theme.text} !important;
  }

  .terminal-content {
    height: 100%;
    width: 100%;
    position: relative;
    display: flex;
    flex-direction: row;
  }

  .terminal-sessions-sidebar {
    width: 200px;
    min-width: 200px;
    border-right: 1px solid ${(props) => props.theme.border || 'rgba(255, 255, 255, 0.08)'};
    background: ${(props) => props.theme.sidebarBackground || props.theme.background};
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .terminal-sessions-header {
    padding: 12px;
    font-weight: 600;
    font-size: 13px;
    color: ${(props) => props.theme.text};
    border-bottom: 1px solid ${(props) => props.theme.border || 'rgba(255, 255, 255, 0.08)'};
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .terminal-sessions-list {
    flex: 1;
    overflow-y: auto;

    /* Custom scrollbar styling - subtle */
    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.15);
    }
  }

  .terminal-session-item {
    padding: 10px 12px;
    cursor: pointer;
    border-bottom: 1px solid ${(props) => props.theme.border};
    transition: background 0.2s;
    display: flex;
    flex-direction: column;
    gap: 4px;

    &:hover {
      background: ${(props) => props.theme.sidebarHover || 'rgba(255, 255, 255, 0.05)'};
    }

    &.active {
      background: ${(props) => props.theme.sidebarActive || 'rgba(59, 142, 234, 0.15)'};
      border-left: 3px solid ${(props) => props.theme.brandColor || '#3b8eea'};
    }
  }

  .terminal-session-name {
    font-size: 13px;
    font-weight: 500;
    color: ${(props) => props.theme.text};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .terminal-session-path {
    font-size: 11px;
    color: ${(props) => props.theme.textSecondary || '#888'};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .terminal-display-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .terminal-loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: #888;
    font-size: 14px;
    z-index: 10;

    svg {
      opacity: 0.7;
    }

    span {
      font-weight: 500;
    }
  }

  .terminal-container {
    flex: 1;
    position: relative;
    
    .xterm {
      height: 100% !important;
      width: 100% !important;
      padding: 8px;
    }

    .xterm-viewport {
      background: transparent !important;
    }

    .xterm-screen {
      background: transparent !important;
    }

    .xterm-decoration-overview-ruler {
      display: none;
    }

    /* Custom scrollbar for terminal */
    .xterm-viewport::-webkit-scrollbar {
      width: 8px;
    }

    .xterm-viewport::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
    }

    .xterm-viewport::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
    }

    .xterm-viewport::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }

  /* Dark theme adjustments */
  .xterm-helper-textarea {
    position: absolute !important;
    left: -9999px !important;
    top: -9999px !important;
  }

  /* Selection styling */
  .xterm .xterm-selection div {
    background-color: rgba(255, 255, 255, 0.3) !important;
  }

  /* Cursor styling */
  .xterm .xterm-cursor-layer .xterm-cursor {
    background-color: #d4d4d4 !important;
  }

  /* Link styling */
  .xterm .xterm-decoration-link {
    text-decoration: underline;
    color: #3b8eea;
  }

  .xterm .xterm-decoration-link:hover {
    color: #5ba7f7;
  }
`;

export default StyledWrapper;
