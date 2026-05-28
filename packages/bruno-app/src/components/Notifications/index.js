import { IconBell, IconDotsVertical } from '@tabler/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import StyledWrapper from './StyleWrapper';
import Modal from 'components/Modal/index';
import Portal from 'components/Portal';
import Dropdown from 'components/Dropdown';
import { useApp } from 'providers/App';
import { useTheme } from 'providers/Theme';
import {
  clearAllNotifications,
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  resetClearedNotifications
} from 'providers/ReduxStore/slices/notifications';
import { useDispatch, useSelector } from 'react-redux';
import { humanizeDate, relativeDate } from 'utils/common';
import ToolHint from 'components/ToolHint';
import DOMPurify from 'dompurify';

const TABS = { ALL: 'all', UNREAD: 'unread' };

const Notifications = () => {
  const dispatch = useDispatch();
  const { version } = useApp();
  const { theme } = useTheme();
  const notifications = useSelector((state) => state.notifications.notifications);
  const clearedIds = useSelector((state) => state.notifications.clearedNotificationIds);

  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS.ALL);
  const [unreadSnapshot, setUnreadSnapshot] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const dropdownTippyRef = useRef(null);
  const modalContentRef = useRef(null);

  const SIDEBAR_MIN = 200;
  const SIDEBAR_MAX = 420;

  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizingSidebar(true);
  };

  useEffect(() => {
    if (!isResizingSidebar) return;

    const handleMove = (e) => {
      const container = modalContentRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, e.clientX - rect.left));
      setSidebarWidth(next);
    };
    const handleUp = () => setIsResizingSidebar(false);

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [isResizingSidebar]);
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);
  const hideDropdown = () => dropdownTippyRef.current?.hide();

  const visibleNotifications = useMemo(
    () => notifications.filter((n) => !clearedIds?.includes(n.id)),
    [notifications, clearedIds]
  );
  const unreadCount = useMemo(
    () => visibleNotifications.filter((n) => !n.read).length,
    [visibleNotifications]
  );
  // Unread tab uses a snapshot taken when the tab is entered so items don't
  // disappear out from under the user as they get marked read. The snapshot
  // refreshes whenever the user leaves and comes back to Unread.
  const listed = useMemo(() => {
    if (activeTab !== TABS.UNREAD) return visibleNotifications;
    if (!unreadSnapshot) return visibleNotifications.filter((n) => !n.read);
    return visibleNotifications.filter((n) => unreadSnapshot.has(n.id));
  }, [activeTab, visibleNotifications, unreadSnapshot]);

  const handleTabChange = (tab) => {
    if (tab === TABS.UNREAD) {
      const ids = visibleNotifications.filter((n) => !n.read).map((n) => n.id);
      setUnreadSnapshot(new Set(ids));
    } else {
      setUnreadSnapshot(null);
    }
    setActiveTab(tab);
  };

  useEffect(() => {
    dispatch(fetchNotifications({ currentVersion: version }));
  }, []);

  useEffect(() => {
    if (!showNotificationsModal) {
      setSelectedNotification(null);
      setActiveTab(TABS.ALL);
      setUnreadSnapshot(null);
    }
  }, [showNotificationsModal]);

  useEffect(() => {
    if (!showNotificationsModal) return;
    if (selectedNotification && listed.find((n) => n.id === selectedNotification.id)) return;
    const first = listed[0];
    if (!first) {
      setSelectedNotification(null);
      return;
    }
    setSelectedNotification(first);
    // Mark first item as read on auto-pick. Safe to do here because in the
    // Unread tab `listed` is snapshotted, so marking-as-read does not cause
    // items to drop out of the list and trigger a cascade re-pick.
    if (!first.read) {
      dispatch(markNotificationAsRead({ notificationId: first.id }));
    }
  }, [listed, selectedNotification, showNotificationsModal]);

  const handleNotificationItemClick = (notification) => (e) => {
    e.preventDefault();
    setSelectedNotification(notification);
    if (!notification.read) {
      dispatch(markNotificationAsRead({ notificationId: notification.id }));
    }
  };

  const getSanitizedDescription = (description) => {
    return DOMPurify.sanitize(description || '', {
      ALLOWED_TAGS: ['a', 'ul', 'img', 'li', 'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br', 'strong', 'em'],
      ALLOWED_ATTR: ['href', 'style', 'target', 'src', 'alt']
    });
  };

  // The description is rendered inside a sandboxed iframe (no allow-scripts) so any
  // injected markup is isolated from the app. The iframe doesn't inherit the app's
  // styles, so we inline the theme's fonts/colors to keep formatting consistent.
  const buildDescriptionDocument = (description) => {
    const body = getSanitizedDescription(description);
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <base target="_blank" />
    <style>
      html, body { margin: 0; padding: 0; background: ${theme.notifications.bg}; }
      body {
        font-family: Inter, sans-serif;
        font-size: 12px;
        line-height: 20px;
        font-weight: 500;
        color: ${theme.colors.text.muted};
        word-break: break-word;
      }
      p { margin: 0 0 0.75rem 0; }
      a { color: ${theme.textLink}; text-decoration: underline; }
      h1, h2, h3, h4, h5, h6 { font-size: 13px; font-weight: 600; margin: 0 0 0.5rem 0; color: ${theme.text}; }
      ul { padding-left: 1.25rem; margin: 0 0 0.75rem 0; }
      img { max-width: 100%; }
    </style>
  </head>
  <body>${body}</body>
</html>`;
  };

  const menuIcon = (
    <span className="notif-menu-trigger" aria-label="Notifications menu">
      <IconDotsVertical size={16} strokeWidth={1.5} />
    </span>
  );

  return (
    <StyledWrapper>
      <a
        className="relative cursor-pointer"
        onClick={() => {
          dispatch(fetchNotifications({ currentVersion: version }));
          setShowNotificationsModal(true);
        }}
        aria-label="Check all Notifications"
      >
        <ToolHint text="Notifications" toolhintId="Notifications" offset={8}>
          <IconBell
            size={16}
            aria-hidden
            strokeWidth={1.5}
            className={`${unreadCount > 0 ? 'bell' : ''}`}
          />
          {unreadCount > 0 && (
            <span className="notification-count text-xs">{unreadCount}</span>
          )}
        </ToolHint>
      </a>

      {showNotificationsModal && (
        <Portal>
          <Modal
            size="md"
            title="Notifications"
            confirmText="Close"
            handleConfirm={() => setShowNotificationsModal(false)}
            handleCancel={() => setShowNotificationsModal(false)}
            hideFooter={true}
            disableCloseOnOutsideClick={true}
            disableEscapeKey={true}
          >
            <div className="notifications-modal" ref={modalContentRef}>
              {visibleNotifications.length === 0 ? (
                <div className="notif-empty">
                  <div className="notif-empty-text">You are all caught up!</div>
                  {clearedIds?.length > 0 && (
                    <div className="notif-empty-actions">
                      <button
                        type="button"
                        className="notif-empty-btn"
                        onClick={() => dispatch(resetClearedNotifications())}
                      >
                        Restore cleared
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div
                    className="notif-sidebar"
                    style={{ width: sidebarWidth, flexBasis: sidebarWidth }}
                  >
                    <div className="notif-tabs">
                      <div className="notif-tab-group">
                        <button
                          type="button"
                          className={`notif-tab ${activeTab === TABS.ALL ? 'active' : ''}`}
                          onClick={() => handleTabChange(TABS.ALL)}
                        >
                          All
                        </button>
                        <button
                          type="button"
                          className={`notif-tab ${activeTab === TABS.UNREAD ? 'active' : ''}`}
                          onClick={() => handleTabChange(TABS.UNREAD)}
                        >
                          Unread
                          {unreadCount > 0 && (
                            <span className="notif-tab-badge">{unreadCount}</span>
                          )}
                        </button>
                      </div>
                      <Dropdown icon={menuIcon} placement="bottom-end" onCreate={onDropdownCreate}>
                        <div
                          className={`dropdown-item ${unreadCount === 0 ? 'disabled' : ''}`}
                          onClick={() => {
                            if (unreadCount === 0) return;
                            hideDropdown();
                            dispatch(markAllNotificationsAsRead());
                          }}
                        >
                          Mark all as read
                        </div>
                        <div
                          className="dropdown-item"
                          onClick={() => {
                            hideDropdown();
                            dispatch(clearAllNotifications());
                          }}
                        >
                          Clear all
                        </div>
                      </Dropdown>
                    </div>
                    <ul className="notif-list">
                      {listed.map((notification) => {
                        const isActive = selectedNotification?.id === notification.id;
                        const isUnread = !notification.read;
                        return (
                          <li
                            key={notification.id}
                            className={`notif-list-item ${isActive ? 'active' : ''} ${
                              isUnread ? 'unread' : ''
                            }`}
                            onClick={handleNotificationItemClick(notification)}
                          >
                            <div className={`notif-item-title ${isUnread ? 'unread' : ''}`}>
                              {notification.title}
                            </div>
                            <div className="notif-item-date">{relativeDate(notification.date)}</div>
                          </li>
                        );
                      })}
                      {listed.length === 0 && (
                        <li className="notif-list-empty">No notifications to show.</li>
                      )}
                    </ul>
                  </div>
                  <div
                    className={`notif-resize-handle ${isResizingSidebar ? 'dragging' : ''}`}
                    onMouseDown={handleResizeStart}
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize sidebar"
                  />
                  <div className="notif-detail">
                    {selectedNotification ? (
                      <>
                        <div className="notif-detail-header">
                          <div className="notif-detail-meta">
                            {selectedNotification.type && (
                              <span
                                className="notif-type-badge"
                                data-variant={selectedNotification.type.toLowerCase().split(/\s+/)[0]}
                              >
                                {selectedNotification.type}
                              </span>
                            )}
                            <span className="notif-detail-date">
                              {humanizeDate(selectedNotification.date)}
                            </span>
                          </div>
                          <div className="notif-detail-title">{selectedNotification.title}</div>
                        </div>
                        <iframe
                          className="notif-detail-body"
                          title="Notification details"
                          sandbox="allow-popups"
                          srcDoc={buildDescriptionDocument(selectedNotification.description)}
                        />
                      </>
                    ) : (
                      <div className="notif-empty">Select a notification to read more.</div>
                    )}
                  </div>
                </>
              )}
            </div>
          </Modal>
        </Portal>
      )}
    </StyledWrapper>
  );
};

export default Notifications;
