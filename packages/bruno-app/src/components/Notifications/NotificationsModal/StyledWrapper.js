import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: row;
  width: 800px;
  height: 520px;
  max-width: 100%;
  max-height: 70vh;
  overflow: hidden;
  background-color: ${(props) => props.theme.notifications.bg};

  /* While dragging, stop the detail iframe from swallowing mousemove events,
     which would otherwise freeze the resize until the cursor re-enters the handle. */
  &.dragging .notif-detail-body {
    pointer-events: none;
  }

  .notif-sidebar {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    background-color: ${(props) => props.theme.notifications.list.bg};
  }

  .notif-resize-handle {
    flex: 0 0 1px;
    cursor: col-resize;
    background: ${(props) => props.theme.notifications.list.borderBottom};
    position: relative;
    user-select: none;
    transition: background-color 0.15s ease;

    /* widen the hit target without bloating the visible line */
    &::before {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: -3px;
      right: -3px;
    }

    &:hover,
    &.dragging {
      background: ${(props) => props.theme.colors.text.yellow};
    }
  }

  .notif-tabs {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 12px;
    gap: 6px;
    border-bottom: 1px solid ${(props) => props.theme.notifications.list.borderBottom};
  }

  .notif-tab-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .notif-tab {
    height: 24px;
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid ${(props) => props.theme.notifications.list.borderBottom};
    font-size: 12px;
    line-height: 20px;
    font-weight: 400;
    color: ${(props) => props.theme.text};
    background: transparent;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;

    &.active {
      background-color: ${(props) => props.theme.brand};
      color: ${(props) => props.theme.background.base};
      font-weight: 500;

      .notif-tab-badge {
        background-color: ${(props) => props.theme.background.base};
        color: ${(props) => props.theme.brand};
        border-color: ${(props) => props.theme.background.base};
      }
    }
  }

  .notif-tab-badge {
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 999px;
    border: 1px solid ${(props) => props.theme.notifications.list.borderBottom};
    background-color: ${(props) => rgba(props.theme.brand, 0.1)};
    color: ${(props) => props.theme.brand};
    font-size: 11px;
    line-height: 14px;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .notif-menu-trigger {
    cursor: pointer;
    color: ${(props) => props.theme.colors.text.muted};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    border-radius: 4px;

    &:hover {
      background-color: ${(props) => props.theme.notifications.list.hoverBg};
    }
  }

  .notif-list {
    list-style: none;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
    background-color: ${(props) => props.theme.notifications.list.bg};
  }

  .notif-list-empty {
    padding: 16px 12px;
    color: ${(props) => props.theme.colors.text.muted};
    font-size: 12px;
    font-style: italic;
    text-align: center;
  }

  .notif-list-item {
    position: relative;
    padding: 8px 12px;
    cursor: pointer;
    border-bottom: solid 1px ${(props) => props.theme.notifications.list.borderBottom};
    display: flex;
    flex-direction: column;
    gap: 0;

    &:hover {
      background-color: ${(props) => props.theme.notifications.list.hoverBg};
    }

    &.unread {
      background-color: ${(props) => props.theme.notifications.list.active.bg};

      &:hover {
        background-color: ${(props) => props.theme.notifications.list.hoverBg};
      }
    }

    &.active {
      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 2px;
        background-color: ${(props) => props.theme.colors.text.yellow};
      }
    }
  }

  .notif-item-title {
    color: ${(props) => props.theme.text};
    font-size: 13px;
    line-height: 20px;
    font-weight: 400;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;

    &.unread {
      font-weight: 600;
    }
  }

  .notif-item-date,
  .notif-detail-date {
    color: ${(props) => props.theme.colors.text.muted};
    font-size: 12px;
    line-height: 20px;
    font-weight: 500;
  }

  .notif-detail {
    flex: 1;
    min-width: 0;
    padding: 6px 6px 0 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .notif-detail-header {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 0 12px;
  }

  .notif-detail-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 1px;
    min-height: 24px;
  }

  .notif-type-badge {
    height: 24px;
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid ${(props) => props.theme.notifications.list.borderBottom};
    font-size: 12px;
    line-height: 20px;
    font-weight: 400;
    display: inline-flex;
    align-items: center;
  }

  .notif-detail-title {
    color: ${(props) => props.theme.text};
    font-size: 13px;
    line-height: 20px;
    font-weight: 600;
  }

  .notif-detail-body {
    flex: 1;
    min-height: 0;
    width: 100%;
    border: none;
    background: transparent;
  }

  .notif-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: ${(props) => props.theme.colors.text.muted};
    font-size: 13px;
  }

  .notif-empty-text {
    font-style: italic;
  }
`;

export default StyledWrapper;
