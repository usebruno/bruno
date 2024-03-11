import { createSlice } from '@reduxjs/toolkit';
import filter from 'lodash/filter';
import toast from 'react-hot-toast';
import { getReadNotificationIds, setReadNotificationsIds } from 'utils/common/notifications';
import { getAppInstallDate } from 'utils/common/platform';

const initialState = {
  isDragging: false,
  idbConnectionReady: false,
  leftSidebarWidth: 222,
  screenWidth: 500,
  showHomePage: false,
  showPreferences: false,
  isEnvironmentSettingsModalOpen: false,
  preferences: {
    request: {
      sslVerification: true,
      customCaCertificate: {
        enabled: false,
        filePath: null
      },
      timeout: 0
    },
    font: {
      codeFont: 'default'
    }
  },
  cookies: [],
  taskQueue: [],
  notifications: [],
  fetchingNotifications: false,
  readNotificationIds: getReadNotificationIds() || []
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    idbConnectionReady: (state) => {
      state.idbConnectionReady = true;
    },
    refreshScreenWidth: (state) => {
      state.screenWidth = window.innerWidth;
    },
    updateLeftSidebarWidth: (state, action) => {
      state.leftSidebarWidth = action.payload.leftSidebarWidth;
    },
    updateIsDragging: (state, action) => {
      state.isDragging = action.payload.isDragging;
    },
    updateEnvironmentSettingsModalVisibility: (state, action) => {
      state.isEnvironmentSettingsModalOpen = action.payload;
    },
    showHomePage: (state) => {
      state.showHomePage = true;
    },
    hideHomePage: (state) => {
      state.showHomePage = false;
    },
    showPreferences: (state, action) => {
      state.showPreferences = action.payload;
    },
    updatePreferences: (state, action) => {
      state.preferences = action.payload;
    },
    updateCookies: (state, action) => {
      state.cookies = action.payload;
    },
    insertTaskIntoQueue: (state, action) => {
      state.taskQueue.push(action.payload);
    },
    removeTaskFromQueue: (state, action) => {
      state.taskQueue = filter(state.taskQueue, (task) => task.uid !== action.payload.taskUid);
    },
    removeAllTasksFromQueue: (state) => {
      state.taskQueue = [];
    },
    fetchingNotifications: (state, action) => {
      state.fetchingNotifications = action.payload.fetching;
    },
    updateNotifications: (state, action) => {
      let notifications = action.payload.notifications || [];
      let readNotificationIds = state.readNotificationIds;

      // App installed date
      let appInstalledOnDate = getAppInstallDate();

      // date 5 days before
      let dateFiveDaysBefore = new Date();
      dateFiveDaysBefore.setDate(dateFiveDaysBefore.getDate() - 5);

      // check if app was installed in the last 5 days
      if (appInstalledOnDate > dateFiveDaysBefore) {
        // filter out notifications that were sent before the app was installed
        notifications = notifications.filter(
          (notification) => new Date(notification.date) > new Date(appInstalledOnDate)
        );
      } else {
        // filter out notifications that sent within the last 5 days
        notifications = notifications.filter(
          (notification) => new Date(notification.date) > new Date(dateFiveDaysBefore)
        );
      }

      state.notifications = notifications.map((notification) => {
        return {
          ...notification,
          read: readNotificationIds.includes(notification.id)
        };
      });
    },
    markNotificationAsRead: (state, action) => {
      let readNotificationIds = state.readNotificationIds;
      readNotificationIds.push(action.payload.notificationId);
      state.readNotificationIds = readNotificationIds;

      // set the read notification ids in the localstorage
      setReadNotificationsIds(readNotificationIds);

      state.notifications = state.notifications.map((notification) => {
        return {
          ...notification,
          read: readNotificationIds.includes(notification.id)
        };
      });
    },
    markMultipleNotificationsAsRead: (state, action) => {
      let readNotificationIds = state.readNotificationIds;
      readNotificationIds.push(...action.payload.notificationIds);
      state.readNotificationIds = readNotificationIds;

      // set the read notification ids in the localstorage
      setReadNotificationsIds(readNotificationIds);

      state.notifications = state.notifications.map((notification) => {
        return {
          ...notification,
          read: readNotificationIds.includes(notification.id)
        };
      });
    }
  }
});

export const {
  idbConnectionReady,
  refreshScreenWidth,
  updateLeftSidebarWidth,
  updateIsDragging,
  updateEnvironmentSettingsModalVisibility,
  showHomePage,
  hideHomePage,
  showPreferences,
  updatePreferences,
  updateCookies,
  insertTaskIntoQueue,
  removeTaskFromQueue,
  removeAllTasksFromQueue,
  updateNotifications,
  fetchingNotifications,
  mergeNotifications,
  markNotificationAsRead,
  markMultipleNotificationsAsRead
} = appSlice.actions;

export const savePreferences = (preferences) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    ipcRenderer
      .invoke('renderer:save-preferences', preferences)
      .then(() => toast.success('Preferences saved successfully'))
      .then(() => dispatch(updatePreferences(preferences)))
      .then(resolve)
      .catch((err) => {
        toast.error('An error occurred while saving preferences');
        console.error(err);
        reject(err);
      });
  });
};

export const deleteCookiesForDomain = (domain) => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    ipcRenderer.invoke('renderer:delete-cookies-for-domain', domain).then(resolve).catch(reject);
  });
};

export const fetchNotifications = () => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    dispatch(fetchingNotifications({ fetching: true }));
    ipcRenderer
      .invoke('renderer:fetch-notifications')
      .then((notifications) => {
        dispatch(updateNotifications({ notifications }));
        dispatch(fetchingNotifications({ fetching: false }));
      })
      .then(resolve)
      .catch((err) => {
        toast.error('An error occurred while fetching notifications');
        dispatch(fetchingNotifications({ fetching: false }));
        console.error(err);
        resolve();
      });
  });
};

export const completeQuitFlow = () => (dispatch, getState) => {
  const { ipcRenderer } = window;
  return ipcRenderer.invoke('main:complete-quit-flow');
};

export default appSlice.reducer;
