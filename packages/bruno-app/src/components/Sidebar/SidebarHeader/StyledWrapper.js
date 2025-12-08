import styled from 'styled-components';

const StyledWrapper = styled.div`
  padding: 8px 4px 6px 10px;

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    border-bottom: 1px solid ${(props) => props.theme.sidebar.collection.item.hoverBg};
  }

  /* Section Title (single view mode) */
  .section-title {
    display: flex;
    align-items: center;
    gap: 6px;
    color: ${(props) => props.theme.sidebar.color};
    font-size: 12px;
    font-weight: 600;
    padding: 2px 0;

    svg {
      color: ${(props) => props.theme.sidebar.muted};
    }
  }

  /* View Tabs (multi-view mode) */
  .view-tabs {
    display: flex;
    align-items: center;
    gap: 2px;
    background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    border-radius: 6px;
    padding: 2px;
  }

  .view-tab {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    color: ${(props) => props.theme.sidebar.muted};
    font-size: 11px;
    font-weight: 500;
    transition: all 0.15s ease;
    white-space: nowrap;

    &:hover {
      color: ${(props) => props.theme.sidebar.color};
    }

    &.active {
      background: ${(props) => props.theme.sidebar.bg};
      color: ${(props) => props.theme.sidebar.color};
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    svg {
      flex-shrink: 0;
    }

    span {
      display: none;
    }

    @media (min-width: 280px) {
      span {
        display: inline;
      }
    }
  }

  /* Header Actions */
  .header-actions {
    display: flex;
    align-items: center;
    gap: 1px;
  }

  .action-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    color: ${(props) => props.theme.sidebar.muted};
    transition: all 0.15s ease;

    &:hover {
      background: ${(props) => props.theme.dropdown?.hoverBg || props.theme.sidebar?.collection?.item?.hoverBg};
      color: ${(props) => props.theme.dropdown?.mutedText || props.theme.text?.muted || '#888'};
    }
  }
`;

export default StyledWrapper;
