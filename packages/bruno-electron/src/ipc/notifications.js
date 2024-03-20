require('dotenv').config();
const { ipcMain } = require('electron');
const fetch = require('node-fetch');

const registerNotificationsIpc = (mainWindow, watcher) => {
  ipcMain.handle('renderer:fetch-notifications', async () => {
    try {
      const notifications = await fetchNotifications();
      return Promise.resolve(notifications);
    } catch (error) {
      return Promise.reject(error);
    }
  });
};

module.exports = registerNotificationsIpc;

const fetchNotifications = async () => {
  try {
    let url = process.env.BRUNO_INFO_ENDPOINT || 'https://appinfo.usebruno.com';
    const data = await fetch(url).then((res) => res.json());

    return data?.notifications || [];
  } catch (error) {
    return Promise.reject('Error while fetching notifications!', error);
  }
};
