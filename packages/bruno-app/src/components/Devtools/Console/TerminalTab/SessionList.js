import React from 'react';
import { IconTerminal, IconPlus, IconX } from '@tabler/icons';
import styled from 'styled-components';

const StyledSessionList = styled.div`
  .session-list-item {
    padding: 10px 12px;
    cursor: pointer;
    border-bottom: 1px solid ${(props) => props.theme.border || 'rgba(255, 255, 255, 0.05)'};
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    gap: 4px;
    position: relative;

    &:hover {
      background: ${(props) => props.theme.sidebarHover || 'rgba(255, 255, 255, 0.05)'};
      
      .session-close-btn {
        opacity: 1;
      }
    }

    &.active {
      background: ${(props) => props.theme.sidebarActive || 'rgba(59, 142, 234, 0.12)'};
      border-left: 2px solid ${(props) => props.theme.brandColor || '#3b8eea'};
    }

    &:last-child {
      border-bottom: none;
    }
  }

  .session-close-btn {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    opacity: 0;
    transition: opacity 0.2s;
    padding: 4px;
    cursor: pointer;
    color: ${(props) => props.theme.textSecondary || '#888'};
    
    &:hover {
      color: ${(props) => props.theme.text};
      background: ${(props) => props.theme.sidebarHover || 'rgba(255, 255, 255, 0.1)'};
      border-radius: 4px;
    }
  }

  .session-name {
    font-size: 13px;
    font-weight: 500;
    color: ${(props) => props.theme.text};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding-right: 24px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .session-icon {
    flex-shrink: 0;
    opacity: 0.7;
  }

  .session-path {
    font-size: 11px;
    color: ${(props) => props.theme.textSecondary || '#888'};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const SessionList = ({ sessions, activeSessionId, onSelectSession, onCloseSession }) => {
  const getSessionDisplayInfo = (session) => {
    if (session.name) {
      return { name: session.name };
    }
    
    if (session.cwd) {
      // Normalize path and get the last directory name
      const normalizedPath = session.cwd.replace(/\\/g, '/').replace(/\/$/, '');
      const pathParts = normalizedPath.split('/').filter(p => p);
      
      if (pathParts.length > 0) {
        const folderName = pathParts[pathParts.length - 1];
        return { name: folderName };
      }
      
      // If it's root or home directory
      if (normalizedPath === '' || normalizedPath === '/' || normalizedPath.match(/^[A-Z]:\/?$/)) {
        return { name: 'Root' };
      }
    }
    
    // Fallback: use a cool name based on session ID
    const shortId = session.sessionId.split('_')[1]?.slice(-6) || session.sessionId.slice(-6);
    return { name: `Terminal ${shortId}` };
  };

  const getSessionPath = (session) => {
    if (session.cwd) {
      const pathParts = session.cwd.split(/[/\\]/);
      if (pathParts.length > 3) {
        return `.../${pathParts.slice(-2).join('/')}`;
      }
      return session.cwd;
    }
    return '~';
  };

  const getFullPath = (session) => {
    if (session.cwd) {
      return session.cwd;
    }
    return '~ (Home Directory)';
  };

  return (
    <StyledSessionList>
      {sessions.map((session) => {
        const { name } = getSessionDisplayInfo(session);
        return (
          <div
            key={session.sessionId}
            className={`session-list-item ${activeSessionId === session.sessionId ? 'active' : ''}`}
            onClick={() => onSelectSession(session.sessionId)}
            title={getFullPath(session)}
          >
            <div className="session-name">
              <IconTerminal className="session-icon" size={14} />
              <span>{name}</span>
            </div>
            <div className="session-path">{getSessionPath(session)}</div>
            <div
              className="session-close-btn"
              onClick={(e) => {
                e.stopPropagation();
                onCloseSession(session.sessionId);
              }}
            >
              <IconX size={14} />
            </div>
          </div>
        );
      })}
    </StyledSessionList>
  );
};

export default SessionList;

