import styled from 'styled-components';

const StyledWrapper = styled.div`
  background-color: ${props => props.theme.sidebar.bg};
  height: 100%;
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow: hidden;

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border-bottom: 1px solid ${props => props.theme.sidebar.dragbar};
    margin-bottom: 0.5rem;

    .counter {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .btn-select-all,
    .btn-reset {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      color: ${props => props.theme.textLink};
      background: none;
      border: none;
      padding: 0.25rem 0.5rem;
      cursor: pointer;
      
      &:hover {
        text-decoration: underline;
      }
    }
  }

  .request-list {
    flex: 1;
    overflow-y: auto;
    
    &::-webkit-scrollbar {
      width: 6px;
    }
    
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    
    &::-webkit-scrollbar-thumb {
      background-color: ${props => props.theme.console.scrollbarThumb};
      border-radius: 3px;
    }

    .loading-message, 
    .empty-message {
      padding: 0.75rem;
      color: ${props => props.theme.colors.text.muted};
      font-size: 0.875rem;
    }
    
    .requests-container {
      padding: 0.5rem;
      position: relative;
    }
  }

  .request-item {
    display: flex;
    align-items: center;
    padding: 0.5rem;
    border-radius: 4px;
    margin-bottom: 0.25rem;
    position: relative;
    height: 2.5rem;
    border: 1px solid transparent;
    background-color: ${props => props.theme.sidebar.bg};
    transition: transform 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
    
    &.is-selected {
      background-color: ${props => props.theme.requestTabs.active.bg};
    }
    
    &.is-dragging {
      opacity: 0.5;
      background-color: ${props => props.theme.sidebar.bg};
      border: 1px dashed ${props => props.theme.sidebar.dragbar};
      transform: scale(0.98);
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
      z-index: 5;
    }
    
    &::before,
    &::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      height: 2px;
      background: ${props => props.theme.dragAndDrop?.border || props.theme.textLink};
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }

    &::before {
      top: -1px;
    }

    &::after {
      bottom: -1px;
    }

    &.drop-target-above {
      &::before {
        opacity: 1;
        height: 2px;
        background: ${props => props.theme.dragAndDrop?.border || props.theme.textLink};
      }
    }

    &.drop-target-below {
      &::after {
        opacity: 1;
        height: 2px;
        background: ${props => props.theme.dragAndDrop?.border || props.theme.textLink};
      }
    }

    .drag-handle {
      cursor: grab;
      margin-right: 0.25rem;
      color: ${props => props.theme.sidebar.muted};
      display: flex;
      align-items: center;
      transition: color 0.15s ease;
      
      &:hover {
        color: ${props => props.theme.text};
      }
      
      &:active {
        cursor: grabbing;
        color: ${props => props.theme.textLink};
      }
    }
    
    .checkbox-container {
      cursor: pointer;
      margin-right: 0.5rem;
      
      .checkbox {
        width: 1rem;
        height: 1rem;
        border: 1px solid ${props => props.theme.sidebar.dragbar};
        border-radius: 3px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.1s ease;
        
        &:hover {
          border-color: ${props => props.theme.textLink};
        }
      }
    }
    
    .method {
      font-family: monospace;
      font-size: 0.75rem;
      font-weight: 500;
      margin-right: 0.5rem;
      min-width: 3rem;
      color: ${props => props.theme.sidebar.muted}; // Default color for unknown methods
      
      &.method-get {
        color: ${props => props.theme.request.methods.get};
      }
      
      &.method-post {
        color: ${props => props.theme.request.methods.post};
      }
      
      &.method-put {
        color: ${props => props.theme.request.methods.put};
      }
      
      &.method-delete {
        color: ${props => props.theme.request.methods.delete};
      }
      
      &.method-patch {
        color: ${props => props.theme.request.methods.patch};
      }
      
      &.method-options {
        color: ${props => props.theme.request.methods.options};
      }
      
      &.method-head {
        color: ${props => props.theme.request.methods.head};
      }
    }
    
    .request-name {
      flex: 1;
      font-size: 0.875rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      
      .folder-path {
        margin-left: 0.5rem;
        font-size: 0.75rem;
        color: ${props => props.theme.sidebar.muted};
      }
    }
  }
`;

export default StyledWrapper; 