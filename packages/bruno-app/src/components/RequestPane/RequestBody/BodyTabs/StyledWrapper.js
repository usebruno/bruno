import styled from 'styled-components';

const Wrapper = styled.div`
  .body-tabs-header {
    border-bottom: 1px solid ${props => props.theme.border || 'rgba(0, 0, 0, 0.1)'};
    padding-bottom: 8px;
    margin-bottom: 12px;
  }

  .tabs-container {
    display: flex;
    align-items: center;
    width: 100%;
    overflow: hidden;
  }

  .tabs-list {
    display: flex;
    align-items: center;
    gap: 8px;
    overflow-x: auto;
    overflow-y: hidden;
    flex: 1;
    padding-right: 8px;
    scrollbar-width: thin;
    scrollbar-color: ${props => props.theme.border || 'rgba(0, 0, 0, 0.2)'} transparent;

    &::-webkit-scrollbar {
      height: 4px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background-color: ${props => props.theme.border || 'rgba(0, 0, 0, 0.2)'};
      border-radius: 2px;
    }

    &::-webkit-scrollbar-thumb:hover {
      background-color: ${props => props.theme.tabs?.active?.color || 'rgba(0, 0, 0, 0.4)'};
    }
  }

  .body-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    color: ${props => props.theme.tabs?.inactive?.color || props.theme.colors?.text?.muted || '#6b7280'};
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    background: transparent;
    transition: all 0.15s ease;
    position: relative;
    flex-shrink: 0;
    min-width: 80px;
    max-width: 200px;
    white-space: nowrap;

    &:hover {
      color: ${props => props.theme.tabs?.active?.color || props.theme.colors?.text?.default || '#374151'};
      background: ${props => props.theme.bg?.secondary || 'rgba(0, 0, 0, 0.05)'};
    }

    &.active {
      color: ${props => props.theme.tabs?.active?.color || props.theme.colors?.text?.yellow || '#f59e0b'};
      background: ${props => props.theme.bg?.secondary || 'rgba(0, 0, 0, 0.05)'};
    }

    &:focus,
    &:active,
    &:focus-within,
    &:focus-visible,
    &:target {
      outline: none !important;
      box-shadow: none !important;
    }

    .tab-title {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tab-close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border: none;
      border-radius: 2px;
      background: transparent;
      color: inherit;
      cursor: pointer;
      opacity: 0.6;
      transition: all 0.15s ease;
      margin-left: 4px;

      &:hover {
        opacity: 1;
        background: rgba(255, 255, 255, 0.2);
        color: #ef4444;
      }

      &:focus,
      &:active {
        outline: none !important;
        box-shadow: none !important;
      }
    }

    .tab-rename-input {
      background: ${props => props.theme.bg?.primary || '#ffffff'};
      border: 1px solid ${props => props.theme.tabs?.active?.color || '#f59e0b'};
      border-radius: 3px;
      padding: 2px 6px;
      font-size: 0.875rem;
      font-weight: 500;
      color: ${props => props.theme.text || '#000000'};
      outline: none;
      min-width: 60px;
      max-width: 120px;
    }

    &:hover .tab-close-btn {
      opacity: 0.8;
    }
  }

  .add-tab-btn {
    padding: 6px 8px;
    border: 1px dashed ${props => props.theme.border || 'rgba(0, 0, 0, 0.2)'};
    border-radius: 4px;
    background: transparent;
    color: ${props => props.theme.tabs?.inactive?.color || props.theme.colors?.text?.muted || '#9ca3af'};
    cursor: pointer;
    transition: all 0.15s ease;
    margin-left: 4px;
    flex-shrink: 0;
    position: sticky;
    right: 0;

    &:hover {
      color: ${props => props.theme.tabs?.active?.color || props.theme.colors?.text?.default || '#374151'};
      border-color: ${props => props.theme.tabs?.active?.color || props.theme.colors?.text?.muted || '#9ca3af'};
      background: ${props => props.theme.bg?.secondary || 'rgba(0, 0, 0, 0.05)'};
    }

    &:focus,
    &:active,
    &:focus-within,
    &:focus-visible,
    &:target {
      outline: none !important;
      box-shadow: none !important;
    }
  }

  .body-tab-content {
    flex: 1;
    overflow: hidden;
  }
`;

export default Wrapper;
