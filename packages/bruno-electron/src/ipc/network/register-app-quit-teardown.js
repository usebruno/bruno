const { app } = require('electron');

// Both hooks are needed — on macOS window-all-closed does not quit the
// app, and a live socket keeps the event loop (and app) alive regardless.
const registerAppQuitTeardown = (client, { label }) => {
  if (!app || typeof app.on !== 'function') {
    return;
  }

  const teardown = () => {
    if (client && typeof client.clearAllConnections === 'function') {
      try {
        client.clearAllConnections();
      } catch (error) {
        console.error(`Error clearing ${label} connections:`, error);
      }
    }
  };

  app.on('window-all-closed', teardown);
  app.on('before-quit', teardown);
};

module.exports = { registerAppQuitTeardown };
