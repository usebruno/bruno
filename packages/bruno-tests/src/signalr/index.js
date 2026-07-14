const ws = require('ws');
const crypto = require('crypto');

const RS = '\x1E';

const connections = new Map();

const generateConnectionId = () => crypto.randomBytes(16).toString('hex');

const handleSignalRMessage = (ws, data, connectionId) => {
  // Split the RS (0x1E) record separator used by the SignalR JSON protocol
  const frames = data.toString().split(RS).map((s) => s.trim()).filter(Boolean);
  if (!frames.length) return;

  if (frames.length > 1) {
    frames.forEach((frame) => handleSignalRMessage(ws, Buffer.from(frame + RS), connectionId));
    return;
  }

  const trimmed = frames[0];

  let msg;
  try {
    msg = JSON.parse(trimmed);
  } catch (err) {
    return;
  }

  if (msg.type === 6) {
    // Ping — respond with ping
    ws.send(JSON.stringify({ type: 6 }) + RS);
    return;
  }

  if (msg.type === 7) {
    // Close
    ws.close();
    return;
  }

  if (msg.type === 1 && msg.invocationId) {
    // Client invocation — echo back as completion
    const completion = {
      type: 3,
      invocationId: msg.invocationId
    };

    if (msg.target === 'Echo') {
      completion.result = { echoed: msg.arguments };
    } else if (msg.target === 'GetHeaders') {
      const conn = connections.get(connectionId);
      completion.result = { headers: conn ? Object.fromEntries(
        Object.entries(conn.headers || {}).filter(([k]) => !k.startsWith('sec-websocket') && !k.startsWith('upgrade') && k !== 'connection' && k !== 'host')
      ) : {} };
    } else {
      completion.result = { received: msg.arguments };
    }

    ws.send(JSON.stringify(completion) + RS);
  }
};

const signalrWss = new ws.Server({ noServer: true });

signalrWss.on('connection', function connection(ws, request, connectionId) {
  const conn = connections.get(connectionId);
  if (conn) {
    conn.headers = request.headers;
  }

  let handshakeReceived = false;

  ws.on('message', function message(data) {
    if (!handshakeReceived) {
      // Split RS (0x1E) separator that SignalR JSON protocol includes
      const frames = data.toString().split(RS).map((s) => s.trim()).filter(Boolean);
      if (!frames.length) return;
      const msg = frames[0];
      try {
        const handshake = JSON.parse(msg);
        if (handshake.protocol === 'json' && handshake.version === 1) {
          handshakeReceived = true;
          // Send handshake response
          ws.send('{}' + RS);
          // Send welcome invocation
          const welcome = {
            type: 1,
            target: 'Welcome',
            arguments: [{ message: 'Connected to SignalR test hub' }]
          };
          ws.send(JSON.stringify(welcome) + RS);
        }
      } catch (err) {
        ws.close();
      }
      return;
    }

    handleSignalRMessage(ws, data, connectionId);
  });

  ws.on('close', function () {
    connections.delete(connectionId);
  });
});

const signalrRouter = (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  // Only handle /hub paths
  if (!url.pathname.startsWith('/hub')) {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }

  const connectionId = url.searchParams.get('id');
  if (!connectionId) {
    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
    socket.destroy();
    return;
  }

  if (!connections.has(connectionId)) {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }

  signalrWss.handleUpgrade(request, socket, head, function done(ws) {
    signalrWss.emit('connection', ws, request, connectionId);
  });
};

const handleNegotiate = (req, res) => {
  const connectionId = generateConnectionId();
  connections.set(connectionId, { createdAt: Date.now() });

  const negotiate = {
    connectionId,
    connectionToken: connectionId,
    availableTransports: [
      { transport: 'WebSockets', transferFormats: ['Text', 'Binary'] }
    ],
    negotiateVersion: 1
  };

  res.json(negotiate);
};

module.exports = { signalrRouter, handleNegotiate };
