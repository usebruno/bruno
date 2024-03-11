import { IconBell } from '@tabler/icons';
import { useState } from 'react';
import StyledWrapper from './StyleWrapper';
import Modal from 'components/Modal/index';
import { useEffect } from 'react';
import {
  fetchNotifications,
  markMultipleNotificationsAsRead,
  markNotificationAsRead
} from 'providers/ReduxStore/slices/app';
import { useDispatch, useSelector } from 'react-redux';
import { humanizeDate, relativeDate } from 'utils/common/index';

const Notifications = () => {
  const dispatch = useDispatch();
  const notificationsById = useSelector((state) => state.app.notifications);
  const notifications = [...notificationsById].reverse();

  const [showNotificationsModal, toggleNotificationsModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [pageSize, setPageSize] = useState(5);
  const [pageNumber, setPageNumber] = useState(1);

  const notificationsStartIndex = (pageNumber - 1) * pageSize;
  const notificationsEndIndex = pageNumber * pageSize;
  const totalPages = Math.ceil(notifications.length / pageSize);

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

  const unreadNotifications = notifications.filter((notification) => !notification.read);

  const modalHeaderContentComponent = (
    <div className="flex flex-row gap-8">
      <div>NOTIFICATIONS</div>
      {unreadNotifications.length > 0 && (
        <>
          <div className="normal-case font-normal">
            {unreadNotifications.length} <i>unread notifications</i>
          </div>
          <button
            className={`select-none ${1 == 2 ? 'opacity-50' : 'text-link cursor-pointer hover:underline'}`}
            onClick={() => {
              let allNotificationIds = notifications.map((notification) => notification.id);
              dispatch(markMultipleNotificationsAsRead({ notificationIds: allNotificationIds }));
            }}
          >
            {'Mark all as read'}
          </button>
        </>
      )}
    </div>
  );

  return (
    <StyledWrapper>
      <div
        className="relative"
        onClick={() => {
          dispatch(fetchNotifications());
          toggleNotificationsModal(true);
        }}
      >
        <IconBell
          size={18}
          strokeWidth={1.5}
          className={`mr-2 hover:text-gray-700 ${unreadNotifications?.length > 0 ? 'bell' : ''}`}
        />
        {unreadNotifications.length > 0 && (
          <div className="notification-count text-xs">{unreadNotifications.length}</div>
        )}
      </div>
      {showNotificationsModal && (
        <Modal
          size="lg"
          title="Notifications"
          confirmText={'Close'}
          handleConfirm={() => {
            toggleNotificationsModal(false);
          }}
          handleCancel={() => {
            toggleNotificationsModal(false);
          }}
          hideFooter={true}
          headerContentComponent={modalHeaderContentComponent}
        >
          <div className="notifications-modal">
            {notifications?.length > 0 ? (
              <div className="grid grid-cols-4 flex flex-row text-sm">
                <div className="col-span-1 flex flex-col">
                  <ul
                    className="w-full flex flex-col h-[50vh] max-h-[50vh] overflow-y-auto"
                    style={{ maxHeight: '50vh', height: '46vh' }}
                  >
                    {notifications?.slice(notificationsStartIndex, notificationsEndIndex)?.map((notification) => (
                      <li
                        className={`p-4 flex flex-col gap-2 ${
                          selectedNotification?.id == notification?.id ? 'active' : notification?.read ? 'read' : ''
                        }`}
                        onClick={handleNotificationItemClick(notification)}
                      >
                        <div className="notification-title w-full">{notification?.title}</div>
                        {/* human readable relative date */}
                        <div className="notification-date w-full flex justify-start font-normal text-xs py-2">
                          {relativeDate(notification?.date)}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="w-full pagination flex flex-row gap-4 justify-center py-4 items-center">
                    <button
                      className={`pl-2 pr-2 py-3 select-none ${
                        pageNumber <= 1 ? 'opacity-50' : 'text-link cursor-pointer hover:underline'
                      }`}
                      onClick={handlePrev}
                    >
                      {'Previous'}
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
                <div className="flex w-full col-span-3 p-4 flex-col gap-2">
                  <div className="w-full text-lg flex flex-wrap h-fit">{selectedNotification?.title}</div>
                  <div className="w-full notification-date">{humanizeDate(selectedNotification?.date)}</div>
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
