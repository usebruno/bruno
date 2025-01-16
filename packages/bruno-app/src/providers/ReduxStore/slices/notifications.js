import toast from 'react-hot-toast';
import { createSlice } from '@reduxjs/toolkit';
import { getAppInstallDate } from 'utils/common/platform';

const getReadNotificationIds = () => {
  try {
    let readNotificationIdsString = window.localStorage.getItem('bruno.notifications.read');
    let readNotificationIds = readNotificationIdsString ? JSON.parse(readNotificationIdsString) : [];
    return readNotificationIds;
  } catch (err) {
    toast.error('An error occurred while fetching read notifications');
    return [];
  }
};

const setReadNotificationsIds = (val) => {
  try {
    window.localStorage.setItem('bruno.notifications.read', JSON.stringify(val));
  } catch (err) {
    toast.error('An error occurred while setting read notifications');
  }
};

const initialState = {
  loading: false,
  notifications: [],
  readNotificationIds: getReadNotificationIds() || []
};

export const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setFetchingStatus: (state, action) => {
      state.loading = action.payload.fetching;
    },
    setNotifications: (state, action) => {
      let notifications = action.payload.notifications || [];
      let readNotificationIds = state.readNotificationIds;

      // Ignore notifications sent before the app was installed
      let appInstalledOnDate = getAppInstallDate();
      notifications = notifications.filter((notification) => {
        const notificationDate = new Date(notification.date);
        const appInstalledOn = new Date(appInstalledOnDate);

        notificationDate.setHours(0, 0, 0, 0);
        appInstalledOn.setHours(0, 0, 0, 0);

        return notificationDate >= appInstalledOn;
      });

      state.notifications = notifications.map((notification) => {
        return {
          ...notification,
          read: readNotificationIds.includes(notification.id)
        };
      });
    },
    markNotificationAsRead: (state, action) => {
      const { notificationId } = action.payload;

      if (state.readNotificationIds.includes(notificationId)) return;

      const notification = state.notifications.find(
        (notification) => notification.id === notificationId
      );
      if (!notification) return;

      state.readNotificationIds.push(notificationId);
      setReadNotificationsIds(state.readNotificationIds);
      notification.read = true;
    },
    markAllNotificationsAsRead: (state) => {
      let readNotificationIds = state.notifications.map((notification) => notification.id);
      state.readNotificationIds = readNotificationIds;
      setReadNotificationsIds(readNotificationIds);

      state.notifications.forEach((notification) => {
        notification.read = true;
      });
    }
  }
});

export const { setNotifications, setFetchingStatus, markNotificationAsRead, markAllNotificationsAsRead } =
  notificationSlice.actions;

export const fetchNotifications = () => (dispatch, getState) => {
  return new Promise((resolve) => {
    const { ipcRenderer } = window;
    dispatch(setFetchingStatus(true));
    ipcRenderer
      .invoke('renderer:fetch-notifications')
      .then((notifications) => {
        dispatch(setNotifications({ notifications }));
        dispatch(setFetchingStatus(false));
        resolve(notifications);
      })
      .catch((err) => {
        dispatch(setFetchingStatus(false));
        console.error(err);
        resolve([]);
      });
  });
};

export default notificationSlice.reducer;
