import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  clearAllNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead
} from 'providers/ReduxStore/slices/notifications';

export const TABS = { ALL: 'all', UNREAD: 'unread' };

const useNotifications = () => {
  const dispatch = useDispatch();
  const notifications = useSelector((state) => state.notifications.notifications);
  const clearedIds = useSelector((state) => state.notifications.clearedNotificationIds);

  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS.ALL);
  const [pinnedUnreadIds, setPinnedUnreadIds] = useState(null);

  const visibleNotifications = useMemo(
    () => notifications.filter((n) => !clearedIds?.includes(n.id)),
    [notifications, clearedIds]
  );
  const unreadCount = visibleNotifications.filter((n) => !n.read).length;
  // Pin the Unread set on tab entry so reading items doesn't make them vanish.
  const listed = useMemo(() => {
    if (activeTab !== TABS.UNREAD) return visibleNotifications;
    if (!pinnedUnreadIds) return visibleNotifications.filter((n) => !n.read);
    return visibleNotifications.filter((n) => pinnedUnreadIds.has(n.id));
  }, [activeTab, visibleNotifications, pinnedUnreadIds]);

  useEffect(() => {
    if (!isOpen) return;
    if (selectedNotification && listed.find((n) => n.id === selectedNotification.id)) return;
    const first = listed[0];
    if (!first) {
      setSelectedNotification(null);
      return;
    }
    setSelectedNotification(first);
    if (!first.read) {
      dispatch(markNotificationAsRead({ notificationId: first.id }));
    }
  }, [listed, selectedNotification, isOpen]);

  const onTabChange = (tab) => {
    if (tab === TABS.UNREAD) {
      const ids = visibleNotifications.filter((n) => !n.read).map((n) => n.id);
      setPinnedUnreadIds(new Set(ids));
    } else {
      setPinnedUnreadIds(null);
    }
    setActiveTab(tab);
  };

  const onSelect = (notification) => {
    setSelectedNotification(notification);
    if (!notification.read) {
      dispatch(markNotificationAsRead({ notificationId: notification.id }));
    }
  };

  const onMarkAllRead = () => {
    dispatch(markAllNotificationsAsRead());
    if (activeTab === TABS.UNREAD) {
      setPinnedUnreadIds(null);
    }
  };
  const onClearAll = () => dispatch(clearAllNotifications());

  const open = () => {
    window.ipcRenderer?.send('renderer:notifications-opened');
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setSelectedNotification(null);
    setActiveTab(TABS.ALL);
    setPinnedUnreadIds(null);
  };

  return {
    isOpen,
    visibleNotifications,
    listed,
    unreadCount,
    activeTab,
    selectedNotification,
    open,
    close,
    onTabChange,
    onSelect,
    onMarkAllRead,
    onClearAll
  };
};

export default useNotifications;
