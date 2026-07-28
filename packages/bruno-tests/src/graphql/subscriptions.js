const ws = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');

/**
 * Builds a `/api/graphql` upgrade handler backed by graphql-ws's reference
 * server implementation.
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
