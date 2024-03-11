import toast from 'react-hot-toast';

export const getReadNotificationIds = () => {
  try {
    let readNotificationIdsString = window.localStorage.getItem('bruno.notifications.read');
    let readNotificationIds = readNotificationIdsString ? JSON.parse(readNotificationIdsString) : [];
    return readNotificationIds;
  } catch (err) {
    toast.error('An error occurred while fetching read notifications');
  }
};

export const setReadNotificationsIds = (val) => {
  try {
    window.localStorage.setItem('bruno.notifications.read', JSON.stringify(val));
  } catch (err) {
    toast.error('An error occurred while setting read notifications');
  }
};
