

export const registerOpenURL = (app) => {
  app.setAsDefaultProtocolClient('bruno');
  app.on('open-url', (event, url) => {
    const openUrl = new URL(url);
      
    const collectionUrl = openUrl.searchParams.get('url');
    importCollection(mainWindow, collectionUrl);
  });
}