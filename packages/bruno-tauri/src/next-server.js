const { createServer } = require('http');

const devServer = async (dir, port) => {
  const next = require('next')({ dev: true, dir });
  const requestHandler = next.getRequestHandler();

  // Build the renderer code and watch the files
  await next.prepare();

  // Next.js Server
  const server = createServer(requestHandler);

  server.listen(port || 8000, () => {
    // Todo: Need to listen to tauri close event and close the server
    // app.on('before-quit', () => server.close())
  });
};

const run = async () => {
  await devServer('../../renderer', 8000);
};

run();
