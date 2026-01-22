const ws = require('ws');

const onSocketError = (err) => {
  console.error(err);
};

const wss = new ws.Server({
  noServer: true,
  handleProtocols: (protocols, request) => {
    if (request.url == '/ws/sub-proto') {
      if (protocols.has('soap')) {
        return 'soap';
      }
      return false;
    }
    return false;
  }
});

wss.on('connection', function connection(ws, request) {
  ws.on('message', function message(data) {
    const msg = Buffer.from(data).toString().trim();
    let isJSON = false;
    let obj = {};
    try {
      obj = JSON.parse(msg);
      isJSON = true;
    } catch (err) {
      // Not a json value, don't do any modification
    }
    if (isJSON) {
      if ('func' in obj && obj.func === 'headers') {
        return ws.send(JSON.stringify({
          headers: request.headers
        }));
      } else if ('func' in obj && obj.func === 'query') {
        const url = new URL(request.url, `http://${request.headers.host}`);
        const query = Object.fromEntries(url.searchParams.entries());
        return ws.send(JSON.stringify({
          query: query
        }));
      } else {
        return ws.send(JSON.stringify({
          data: JSON.parse(Buffer.from(data).toString())
        }));
      }
    }
    return ws.send(Buffer.from(data).toString());
  });
});

const ACCEPTED_SUB_PROTOS = ['soap'];

const wsRouter = (request, socket, head) => {
  socket.on('error', onSocketError);

  if (!request.url.startsWith('/ws')) {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();

    socket.removeListener('error', onSocketError);
    return;
  }

  if (request.url == '/ws/sub-proto') {
    const subproto = request.headers['sec-websocket-protocol'] || request.headers['Sec-WebSocket-Protocol'];
    const hasAcceptedProtocols = subproto.split(',').some((d) => ACCEPTED_SUB_PROTOS.includes(d));
    if (!hasAcceptedProtocols) {
      const message = 'Unsupported WebSocket subprotocol';
      socket.write('HTTP/1.1 400 Bad Request\r\n'
        + 'Content-Type: text/plain\r\n'
        + `Content-Length: ${Buffer.byteLength(message)}\r\n`
        + 'Connection: close\r\n'
        + '\r\n'
        + message);
      socket.destroy();
      socket.removeListener('error', onSocketError);
      return;
    }
  }

  wss.handleUpgrade(request, socket, head, function done(ws) {
    wss.emit('connection', ws, request);
  });
};

module.exports = wsRouter;
