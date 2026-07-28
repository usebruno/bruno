const ws = require('ws');

// graphql-ws v6 moved `useServer` to `graphql-ws/use/ws`; v5 (pinned here) has
// it at `graphql-ws/lib/use/ws`. This is a test fixture only, never shipped —
// validating our hand-written client against the reference server implementation
// is exactly the mitigation for hand-rolled-protocol conformance drift.
const { useServer } = require('graphql-ws/lib/use/ws');

/**
 * Builds a `/api/graphql` upgrade handler backed by graphql-ws's reference
 * server implementation. Returns a plain `handleUpgrade(request, socket, head)`
 * function rather than registering its own `server.on('upgrade', ...)` listener —
 * the caller (src/index.js) owns the single upgrade dispatcher so this and
 * wsRouter's `/ws` handler never race each other over the same event.
 */
const createGraphQLSubscriptionsUpgradeHandler = (schema) => {
  const wss = new ws.WebSocketServer({ noServer: true });

  useServer(
    {
      schema,
      onConnect: (ctx) => {
        const connectionParams = ctx.connectionParams || {};

        if (connectionParams.rejectInit) {
          return false;
        }

        if (connectionParams.ackDelayMs) {
          return new Promise((resolve) => {
            setTimeout(() => resolve(true), Number(connectionParams.ackDelayMs));
          });
        }

        return true;
      }
    },
    wss
  );

  return (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (client) => {
      wss.emit('connection', client, request);
    });
  };
};

module.exports = createGraphQLSubscriptionsUpgradeHandler;
