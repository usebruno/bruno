import styled from 'styled-components';

const StyledWrapper = styled.div`
  .tags-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    min-height: 40px;
    padding: 8px 0;
  }

  .tag-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 7px;
    background-color: ${(props) => props.theme.sidebar.bg};
    border: 1px solid ${(props) => props.theme.requestTabs.bottomBorder};
    border-radius: 3px;
    font-size: 12px;
    font-weight: 500;
    color: ${(props) => props.theme.text};
    max-width: 200px;
    transition: all 0.2s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    cursor: default;

    &:has(.tag-remove:hover) {
      background-color: ${(props) => props.theme.requestTabs.active.bg};
      border-color: ${(props) => props.theme.requestTabs.active.border || props.theme.requestTabs.bottomBorder};
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      transform: translateY(-1px);
    }

    .tag-remove {
      cursor: pointer;
    }
  }

  .tag-icon {
    color: ${(props) => props.theme.textSecondary || props.theme.text};
    opacity: 0.7;
    flex-shrink: 0;
  }

  .tag-text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .tag-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    cursor: pointer;
    padding: 2px;
    border-radius: 3px;
    color: ${(props) => props.theme.textSecondary || props.theme.text};
    transition: all 0.2s ease;
    flex-shrink: 0;
    opacity: 0.7;

    &:hover {
      background-color: ${(props) => props.theme.danger};
      color: white;
      opacity: 1;
      transform: scale(1.1);
    }

    &:focus-visible {
      outline: 2px solid ${(props) => props.theme.danger};
      outline-offset: 1px;
    }
  }

  .empty-state {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 24px 16px;
    background-color: ${(props) => props.theme.sidebar.bg};
    border: 2px dashed ${(props) => props.theme.requestTabs.bottomBorder};
    border-radius: 3px;
    color: ${(props) => props.theme.textSecondary || props.theme.text};
    text-align: left;
  }

  .empty-icon {
    opacity: 0.5;
    flex-shrink: 0;
  }

  .empty-text {
    flex: 1;
    min-width: 0;
  }

  .empty-title {
    font-weight: 600;
    margin: 0 0 4px 0;
    font-size: 14px;
    color: ${(props) => props.theme.text};
  }

  .empty-subtitle {
    margin: 0;
    font-size: 12px;
    opacity: 0.8;
    line-height: 1.5;
    color: ${(props) => props.theme.textSecondary || props.theme.text};
  }

  /* Responsive design */
  @media (max-width: 480px) {
    .tags-container {
      gap: 6px;
    }
    
    .tag-item {
      padding: 4px 8px;
      font-size: 11px;
    }
    
    .empty-state {
      padding: 16px 12px;
      flex-direction: column;
      text-align: center;
    }
  }
`;

export default StyledWrapper; 