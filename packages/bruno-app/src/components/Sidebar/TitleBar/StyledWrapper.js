import styled from 'styled-components';

const StyledWrapper = styled.div`
  .titlebar-container {
    display: flex;
    align-items: center;
  }

  .workspace-icon-container {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .workspace-letter-logo {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 500;
    background: white;
    color: #5d5d5d;
  }

  .workspace-name-container {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    margin-left: 0px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 0;
    flex: 1;
    max-width: 120px;

    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }

    .workspace-name {
      font-size: 13px;
      font-weight: 600;
      color: ${(props) => props.theme.sidebar.color};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .chevron-icon {
      flex-shrink: 0;
      color: ${(props) => props.theme.sidebar.muted};
      transition: transform 0.2s ease;
    }
  }

  /* Actions Button */
  .actions-container {
    margin-left: auto;
    display: flex;
    align-items: center;
  }

  .home-icon-button,
  .search-icon-button,
  .plus-icon-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.15s ease;
    color: ${(props) => props.theme.text};
  }

  .workspace-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 10px !important;
    margin: 0 !important;
    
    &.active {
      .check-icon {
        opacity: 1;
      }
    }

    &:hover {
      .pin-btn:not(.pinned) {
        opacity: 1;
      }
    }

    .workspace-name {
      flex: 1;
      min-width: 0;
      font-size: 13px;
      font-weight: 400;
      color: ${(props) => props.theme.dropdown.color};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .workspace-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-left: 8px;
      flex-shrink: 0;
      pointer-events: none;
      
      > * {
        pointer-events: auto;
      }
    }

    .check-icon {
      color: ${(props) => props.theme.workspace?.accent || props.theme.colors?.text?.yellow || '#f0c674'};
      flex-shrink: 0;
    }

    .pin-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      padding: 0;
      border: none;
      background: transparent;
      border-radius: 4px;
      cursor: pointer;
      color: ${(props) => props.theme.dropdown?.mutedText || props.theme.text?.muted || '#888'};
      transition: background 0.15s ease, color 0.15s ease, opacity 0.15s ease;
      opacity: 0;

      &.pinned {
        opacity: 1;
      }

      &:hover {
        background: ${(props) => props.theme.dropdown?.hoverBg || props.theme.sidebar?.collection?.item?.hoverBg};
        color: ${(props) => props.theme.dropdown?.mutedText || props.theme.text?.muted || '#888'};
      }
    }
  }

  .collection-dropdown {
    color: ${(props) => props.theme.sidebar.dropdownIcon.color};

    &:hover {
      color: inherit;
    }

    .tippy-box {
      top: -0.5rem;
      position: relative;
      user-select: none;
    }
  }
`;

export default StyledWrapper;
