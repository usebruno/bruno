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
    gap: 16px;
    padding: 6px 4px 6px 8px;
    min-height: 28px;
    height: 28px;
    user-select: none;
    transition: background-color 0.15s ease;
    flex-shrink: 0;
    border-bottom: 1px solid transparent;

    .section-header-left {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
      min-width: 0;
      cursor: pointer;


      &:hover {
        .section-toggle {
          display: flex;
        }

        .section-toggle {
          background: ${(props) => props.theme.dropdown.hoverBg};
          color: ${(props) => props.theme.text} !important;
        }

        .section-icon {
            display: none;
          }
        }
      }
    }

    .section-icon-wrapper {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .section-toggle {
      display: none;
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
  }
`;

export default StyledWrapper;
