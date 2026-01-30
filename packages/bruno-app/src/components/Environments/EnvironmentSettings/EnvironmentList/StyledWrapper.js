import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  display: flex;
  height: 100%;
  overflow: hidden;
  position: relative;

  .environments-container {
    display: flex;
    height: 100%;
    width: 100%;
    overflow: hidden;
  }

  .confirm-switch-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
    background: ${(props) => props.theme.bg};
    padding: 12px;
  }

  /* Left Sidebar */
  .sidebar {
    width: 240px;
    min-width: 240px;
    display: flex;
    flex-direction: column;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 16px 12px 16px;
    
    .title {
      font-size: ${(props) => props.theme.font.size.base};
      font-weight: 500;
      color: ${(props) => props.theme.text};
      margin: 0;
    }
    
    .btn-action {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      padding: 0;
      background: transparent;
      border: none;
      border-radius: 4px;
      color: ${(props) => props.theme.colors.text.muted};
      cursor: pointer;
      transition: all 0.15s ease;
      
      &:hover {
        background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
        color: ${(props) => props.theme.text};
      }
    }
  }

  .search-container {
    position: relative;
    padding: 0 12px 12px 12px;
    
    .search-icon {
      position: absolute;
      left: 20px;
      top: 50%;
      transform: translateY(-100%);
      color: ${(props) => props.theme.colors.text.muted};
      pointer-events: none;
    }
    
    .search-input {
      width: 100%;
      padding: 6px 8px 6px 28px;
      font-size: 12px;
      background: transparent;
      border: 1px solid ${(props) => props.theme.border.border1};
      border-radius: 5px;
      color: ${(props) => props.theme.text};
      transition: all 0.15s ease;
      
      &::placeholder {
        color: ${(props) => props.theme.colors.text.muted};
      }
      
      &:focus {
        outline: none;
      }
    }
  }

  .environments-list {
    flex: 1;
    overflow-y: auto;
    padding: 0 8px;
  }

  .environment-item {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 4px 8px;
    margin-bottom: 1px;
    font-size: 13px;
    color: ${(props) => props.theme.text};
    cursor: pointer;
    border-radius: 5px;
    transition: background 0.15s ease;
    
    .environment-name {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .environment-actions {
      display: flex;
      align-items: center;
      opacity: 0;
      transition: opacity 0.15s ease;

      .activate-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 4px;
        border: none;
        background: transparent;
        cursor: pointer;
        color: ${(props) => props.theme.text.muted};
        border-radius: 3px;
        transition: all 0.15s ease;

        &:hover {
          background: ${(props) => props.theme.workspace.button.bg};
          color: ${(props) => props.theme.colors.text.green};
        }
      }

      .activated-checkmark {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 4px;
        color: ${(props) => props.theme.colors.text.green};
        opacity: 1;
      }
    }

    &:hover .environment-actions {
      opacity: 1;
    }

    &.activated .environment-actions {
      opacity: 1;
    }

    &:hover {
      background: ${(props) => props.theme.workspace.button.bg};
    }
    
    &.active {
      background: ${(props) => props.theme.background.surface0};
      color: ${(props) => props.theme.text};
    }
    
    &.renaming,
    &.creating {
      cursor: default;
      padding: 4px 4px 4px 8px;
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      
      &:hover {
        background: ${(props) => props.theme.workspace.button.bg};
      }
    }

    .rename-container {
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
      overflow: hidden;
      
      .environment-name-input {
        flex: 1;
        min-width: 0;
        background: transparent;
        border: none;
        outline: none;
        color: ${(props) => props.theme.text};
        font-size: 13px;
        padding: 2px 4px;
        
        &::placeholder {
          color: ${(props) => props.theme.colors.text.muted};
        }
      }
      
      .inline-actions {
        display: flex;
        gap: 2px;
        margin-left: 4px;
        flex-shrink: 0;
      }
    }

    &.creating {
      .environment-name-input {
        flex: 1;
        min-width: 0;
        background: transparent;
        border: none;
        outline: none;
        color: ${(props) => props.theme.text};
        font-size: 13px;
        padding: 2px 4px;
        
        &::placeholder {
          color: ${(props) => props.theme.colors.text.muted};
        }
      }
      
      .inline-actions {
        display: flex;
        gap: 2px;
        margin-left: 4px;
        flex-shrink: 0;
      }
    }

    .inline-action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      padding: 0;
      background: transparent;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
      
      &.save {
        color: ${(props) => props.theme.colors.text.green};
        
        &:hover {
          background: ${(props) => rgba(props.theme.colors.text.green, 0.1)};
        }
      }
      
      &.cancel {
        color: ${(props) => props.theme.colors.text.danger};
        
        &:hover {
          background: ${(props) => rgba(props.theme.colors.text.danger, 0.1)};
        }
      }
    }
  }
  
  .env-error {
    padding: 4px 12px;
    margin-top: 4px;
    font-size: 11px;
    color: ${(props) => props.theme.colors.text.danger};
    background: ${(props) => `${props.theme.colors.text.danger}15`};
    border-radius: 4px;
  }
`;

export default StyledWrapper;
