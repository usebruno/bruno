import { IconBell } from '@tabler/icons';
import { useState } from 'react';
import StyledWrapper from './StyleWrapper';
import Modal from 'components/Modal/index';
import { useEffect } from 'react';
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead
} from 'providers/ReduxStore/slices/notifications';
import { useDispatch, useSelector } from 'react-redux';
import { humanizeDate, relativeDate } from 'utils/common';
import ToolHint from 'components/ToolHint';
import { useTheme } from 'providers/Theme';

const PAGE_SIZE = 5;

const Notifications = () => {
  const dispatch = useDispatch();
  const notifications = useSelector((state) => state.notifications.notifications);

  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const { storedTheme } = useTheme();

  const notificationsStartIndex = (pageNumber - 1) * PAGE_SIZE;
  const notificationsEndIndex = pageNumber * PAGE_SIZE;
  const totalPages = Math.ceil(notifications.length / PAGE_SIZE);
  const unreadNotifications = notifications.filter((notification) => !notification.read);

  useEffect(() => {
    dispatch(fetchNotifications());
  }, []);

  useEffect(() => {
    reset();
  }, [showNotificationsModal]);

  useEffect(() => {
    if (!selectedNotification && notifications?.length > 0 && showNotificationsModal) {
      let firstNotification = notifications[0];
      setSelectedNotification(firstNotification);
      dispatch(markNotificationAsRead({ notificationId: firstNotification?.id }));
    }
  }, [notifications, selectedNotification, showNotificationsModal]);

  const reset = () => {
    setSelectedNotification(null);
    setPageNumber(1);
  };

  const handlePrev = (e) => {
    if (pageNumber - 1 < 1) return;
    setPageNumber(pageNumber - 1);
  };

  const handleNext = (e) => {
    if (pageNumber + 1 > totalPages) return;
    setPageNumber(pageNumber + 1);
  };

  const handleNotificationItemClick = (notification) => (e) => {
    e.preventDefault();
    setSelectedNotification(notification);
    dispatch(markNotificationAsRead({ notificationId: notification?.id }));
  };

  const modalCustomHeader = (
    <div className="flex flex-row gap-8">
      <div>NOTIFICATIONS</div>
      {unreadNotifications.length > 0 && (
        <>
          <div className="normal-case font-normal">
            {unreadNotifications.length} <span>unread notifications</span>
          </div>
          <button
            className={`select-none ${1 == 2 ? 'opacity-50' : 'text-link mark-as-read cursor-pointer hover:underline'}`}
            onClick={() => dispatch(markAllNotificationsAsRead())}
          >
            {'Mark all as read'}
          </button>
        </>
      )}
    </div>
  );

  return (
    <StyledWrapper>
      <a
        className="relative cursor-pointer"
        onClick={() => {
          dispatch(fetchNotifications());
          setShowNotificationsModal(true);
        }}
        aria-label="Check all Notifications"
      >
        <ToolHint text="Notifications" toolhintId="Notifications" offset={8}>
          <IconBell
            size={18}
            aria-hidden
            strokeWidth={1.5}
            className={`mr-2 ${unreadNotifications?.length > 0 ? 'bell' : ''}`}
          />
          {unreadNotifications.length > 0 && (
            <span className="notification-count text-xs">{unreadNotifications.length}</span>
          )}
        </ToolHint>
      </a>

      {showNotificationsModal && (
        <Modal
          size="lg"
          title="Notifications"
          confirmText={'Close'}
          handleConfirm={() => {
            setShowNotificationsModal(false);
          }}
          handleCancel={() => {
            setShowNotificationsModal(false);
          }}
          hideFooter={true}
          customHeader={modalCustomHeader}
          disableCloseOnOutsideClick={true}
          disableEscapeKey={true}
        >
          <div className="notifications-modal">
            {notifications?.length > 0 ? (
              <div className="grid grid-cols-4 flex flex-row text-sm">
                <div className="col-span-1 flex flex-col">
                  <ul
                    className="notifications w-full flex flex-col h-[50vh] max-h-[50vh] overflow-y-auto"
                    style={{ maxHeight: '50vh', height: '46vh' }}
                  >
                    {notifications?.slice(notificationsStartIndex, notificationsEndIndex)?.map((notification) => (
                      <li
                        key={notification.id}
                        className={`p-4 flex flex-col justify-center ${
                          selectedNotification?.id == notification.id ? 'active' : notification.read ? 'read' : ''
                        }`}
                        onClick={handleNotificationItemClick(notification)}
                      >
                        <div className="notification-title w-full">{notification?.title}</div>
                        <div className="notification-date text-xs py-2">{relativeDate(notification?.date)}</div>
                      </li>
                    ))}
                  </ul>
                  <div className="w-full pagination flex flex-row gap-4 justify-center p-2 items-center text-xs">
                    <button
                      className={`pl-2 pr-2 py-3 select-none ${
                        pageNumber <= 1 ? 'opacity-50' : 'text-link cursor-pointer hover:underline'
                      }`}
                      onClick={handlePrev}
                    >
                      {'Prev'}
                    </button>
                    <div className="flex flex-row items-center justify-center gap-1">
                      Page
                      <div className="w-[20px] flex justify-center" style={{ width: '20px' }}>
                        {pageNumber}
                      </div>
                      of
                      <div className="w-[20px] flex justify-center" style={{ width: '20px' }}>
                        {totalPages}
                      </div>
                    </div>
                    <button
                      className={`pl-2 pr-2 py-3 select-none ${
                        pageNumber == totalPages ? 'opacity-50' : 'text-link cursor-pointer hover:underline'
                      }`}
                      onClick={handleNext}
                    >
                      {'Next'}
                    </button>
                  </div>
                </div>
                <div className="flex w-full col-span-3 p-4 flex-col">
                  <div className="w-full text-lg flex flex-wrap h-fit mb-1">{selectedNotification?.title}</div>
                  <div className="w-full notification-date text-xs mb-4">
                    {humanizeDate(selectedNotification?.date)}
                  </div>
                  <div
                    className="flex w-full flex-col flex-wrap h-fit"
                    dangerouslySetInnerHTML={{ __html: selectedNotification?.description }}
                  ></div>
                </div>
              </div>
            ) : (
              <div className="opacity-50 italic text-xs p-12 flex justify-center">No Notifications</div>
            )}
          </div>
        </Modal>
      )}
    </StyledWrapper>
  );
};

export default Notifications;
