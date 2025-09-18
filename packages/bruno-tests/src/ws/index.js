const ws = require('ws');

const onSocketError = (err) => {
  console.error(err);
};

const wss = new ws.Server({
  noServer: true
});

wss.on('connection', function connection(ws, request) {
  
  ws.on('message', function message(data) {
    ws.send(
      JSON.stringify({
        data: JSON.parse(Buffer.from(data).toString()),
      })
    );
  });

  
});

const wsRouter = (request, socket, head) => {
  socket.on('error', onSocketError);

  if (request.url !== '/ws') {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();

    socket.removeListener('error', onSocketError);
    return;
  }

  wss.handleUpgrade(request, socket, head, function done(ws) {
    wss.emit('connection', ws, request);
  });
};

module.exports = wsRouter;
