import { useRef } from 'react';
import classnames from 'classnames';
import { useDragResize } from 'hooks/useDragResize';
import { usePersistedState } from 'hooks/usePersistedState';
import Modal from 'components/Modal/index';
import Portal from 'components/Portal';
import StyledWrapper from './StyledWrapper';
import NotificationTabs from './NotificationTabs';
import NotificationList from './NotificationList';
import NotificationDetail from './NotificationDetail';

const DEFAULT_SIDEBAR_WIDTH = 260;
const SIDEBAR_MIN = 200;
// Reserved for the detail pane; caps the sidebar at ~420px in the 800px modal.
const DETAIL_MIN = 380;

const NotificationsModal = ({ notifications, onClose }) => {
  const {
    visibleNotifications,
    listed,
    unreadCount,
    activeTab,
    selectedNotification,
    onTabChange,
    onSelect,
    onMarkAllRead,
    onClearAll
  } = notifications;

  const containerRef = useRef(null);
  const [sidebarWidth, setSidebarWidth] = usePersistedState({
    key: 'notification-sidebar',
    default: DEFAULT_SIDEBAR_WIDTH
  });
  const { dragging, dragWidth, dragbarProps } = useDragResize({
    containerRef,
    width: sidebarWidth,
    onWidthChange: (w) => setSidebarWidth(w ?? DEFAULT_SIDEBAR_WIDTH),
    minLeft: SIDEBAR_MIN,
    minRight: DETAIL_MIN
  });
  const effectiveWidth = dragging ? dragWidth : sidebarWidth;
  const isEmpty = visibleNotifications.length === 0;

  return (
    <Portal>
      <Modal
        size="md"
        title="Notifications"
        confirmText="Close"
        handleConfirm={onClose}
        handleCancel={onClose}
        hideFooter={true}
        disableCloseOnOutsideClick={true}
        disableEscapeKey={true}
        noPadding={true}
      >
        <StyledWrapper className={classnames('notifications-modal', { dragging })} ref={containerRef}>
          <div className="notif-sidebar" style={{ width: effectiveWidth, flexBasis: effectiveWidth }}>
            <NotificationTabs
              activeTab={activeTab}
              unreadCount={unreadCount}
              onTabChange={onTabChange}
              onMarkAllRead={onMarkAllRead}
              onClearAll={onClearAll}
            />
            <NotificationList items={listed} selectedId={selectedNotification?.id} onSelect={onSelect} />
          </div>
          <div
            className={classnames('notif-resize-handle', { dragging })}
            {...dragbarProps}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
          />
          {isEmpty ? (
            <div className="notif-empty">
              <div className="notif-empty-text">You are all caught up!</div>
            </div>
          ) : (
            <NotificationDetail notification={selectedNotification} />
          )}
        </StyledWrapper>
      </Modal>
    </Portal>
  );
};

export default NotificationsModal;
