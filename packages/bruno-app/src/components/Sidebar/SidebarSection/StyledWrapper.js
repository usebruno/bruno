import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;

  .sidebar-section {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;

    &.expanded {
      flex: 1 1 0%;
      min-height: 0;
    }

    &:not(.expanded) {
      flex: 0 0 auto;
    }

    &.multi-expanded {
      flex: 1 1 0%;
      margin-bottom: 0;
    }
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 4px 6px 8px;
    min-height: 28px;
    height: 28px;
    cursor: pointer;
    user-select: none;
    transition: background-color 0.15s ease;
    flex-shrink: 0;

    &:hover {
      background-color: ${(props) => props.theme.sidebar.collection.item.hoverBg};

      .section-toggle {
        display: flex;
      }

      .section-icon {
        display: none;
      }
    }

    .section-header-left {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
      min-width: 0;
    }

    .section-icon-wrapper {
      position: relative;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .section-toggle {
      display: none;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      position: absolute;
      top: 0;
      left: 0;
      color: ${(props) => props.theme.sidebar.muted};
    }

    .section-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      color: ${(props) => props.theme.sidebar.muted};
    }

    .section-title {
      color: ${(props) => props.theme.sidebar.color};
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .section-actions {
      display: flex;
      align-items: center;
      gap: 1px;
      flex-shrink: 0;
    }
  }

  .section-content {
    display: flex;
    flex-direction: column;
    flex: 1 1 0%;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    position: relative;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: ${(props) => props.theme.scrollbar.color};
      border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb:hover {
      background: ${(props) => props.theme.scrollbar.color};
    }
  }
`;

export default StyledWrapper;
