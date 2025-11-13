# WebSocket Flows Documentation

## Flow 1: Establishing a WebSocket Connection

### Overview
This flow establishes a WebSocket connection. It can be triggered in two ways:
1. **Connect Only** - Just establishes connection without sending messages
2. **Connect and Send** - Establishes connection and queues/sends initial messages

---

### Flow Diagram

```
UI Component (WsQueryUrl)
    ↓
Redux Action (wsConnectOnly OR sendRequest)
    ↓
Renderer Process (connectWS / sendWsRequest)
    ↓
IPC Call (renderer:ws:start-connection)
    ↓
Main Process (ws-event-handlers.js)
    ↓
WsClient.startConnection()
    ↓
Native WebSocket Connection
```

---

### Detailed Step-by-Step Flow

#### **Step 1: UI Trigger**
**File:** `packages/bruno-app/src/components/RequestPane/WsQueryUrl/index.js`

**Two entry points:**

**A. Connect Only Button:**
```javascript
// Line 83-86
const handleConnect = (e) => {
  setIsConnecting(true);
  dispatch(wsConnectOnly(item, collection.uid));
};
```

**B. Run Button (Connect + Send):**
```javascript
// Line 74-80
const handleRunClick = async (e) => {
  e.stopPropagation();
  if (!url) {
    toast.error('Please enter a valid WebSocket URL');
    return;
  }
  handleRun(e); // Calls sendRequest action
};
```

**File:** `packages/bruno-app/src/components/RequestTabPanel/index.js`
```javascript
// Line 246-271
const handleRun = async () => {
  // ... validation ...
  dispatch(sendRequest(item, collection.uid))
};
```

---

#### **Step 2: Redux Actions**
**File:** `packages/bruno-app/src/providers/ReduxStore/slices/collections/actions.js`

**A. Connect Only:**
```javascript
// Line 349-380
export const wsConnectOnly = (item, collectionUid) => (dispatch, getState) => {
  // ... setup environment variables ...
  connectWS(itemCopy, collectionCopy, environment, collectionCopy.runtimeVariables, { connectOnly: true })
    .then(resolve)
    .catch((err) => { toast.error(err.message); });
};
```

**B. Send Request (Connect + Send):**
```javascript
// Line 382-437
export const sendRequest = (item, collectionUid) => (dispatch, getState) => {
  // ... setup ...
  if (isWsRequest) {
    sendWsRequest(itemCopy, collectionCopy, environment, collectionCopy.runtimeVariables)
      .then(resolve)
      .catch((err) => { toast.error(err.message); });
  }
};
```

---

#### **Step 3: Renderer Process Network Utils**
**File:** `packages/bruno-app/src/utils/network/index.js`

**A. Connect Only:**
```javascript
// Line 229-242
export const connectWS = async (item, collection, environment, runtimeVariables, options) => {
  return new Promise((resolve, reject) => {
    startWsConnection(item, collection, environment, runtimeVariables, options)
      .then((initialState) => {
        resolve({
          ...initialState,
          timeline: []
        });
      })
      .catch((err) => reject(err));
  });
};
```

**B. Send Request:**
```javascript
// Line 266-284
export const sendWsRequest = async (item, collection, environment, runtimeVariables) => {
  // Ensure connection exists
  const ensureConnection = async () => {
    const connectionStatus = await isWsConnectionActive(item.uid);
    if (!connectionStatus.isActive) {
      await connectWS(item, collection, environment, runtimeVariables, { connectOnly: true });
    }
  };
  
  await ensureConnection();
  
  // Queue all messages with interpolation
  const result = await queueWsMessage(item, collection, environment, runtimeVariables, null);
  // ...
};
```

**C. Start Connection:**
```javascript
// Line 286-308
export const startWsConnection = async (item, collection, environment, runtimeVariables, options) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    const request = item.draft ? item.draft : item;
    const settings = item.draft ? item.draft.settings : item.settings;

    ipcRenderer.invoke('renderer:ws:start-connection', {
      request,
      collection,
      environment,
      runtimeVariables,
      settings,
      options
    }).then(() => resolve()).catch((err) => reject(err));
  });
};
```

---

#### **Step 4: Main Process IPC Handler**
**File:** `packages/bruno-electron/src/ipc/network/ws-event-handlers.js`

```javascript
// Line 210-269
ipcMain.handle('renderer:ws:start-connection',
  async (event, { request, collection, environment, runtimeVariables, settings, options = {} }) => {
    try {
      // 1. Prepare request (merge headers, scripts, vars, auth, interpolate variables)
      const requestCopy = cloneDeep(request);
      const preparedRequest = await prepareWsRequest(requestCopy, collection, environment, runtimeVariables, {});
      
      const connectOnly = options?.connectOnly ?? false;
      
      // 2. If not connect-only, queue initial messages
      if (!connectOnly) {
        const hasMessages = preparedRequest.body.ws.some((msg) => msg.content.length);
        if (hasMessages) {
          preparedRequest.body.ws.forEach((message) => {
            wsClient.queueMessage(preparedRequest.uid, collection.uid, message.content);
          });
        }
      }

      // 3. Start WebSocket connection
      await wsClient.startConnection({
        request: preparedRequest,
        collection,
        options: {
          timeout: settings.timeout,
          keepAlive: settings.keepAliveInterval > 0 ? true : false,
          keepAliveInterval: settings.keepAliveInterval
        }
      });

      // 4. Send events back to renderer
      sendEvent('main:ws:request', preparedRequest.uid, collection.uid, requestSent);
      
      // 5. Handle OAuth credentials if needed
      if (preparedRequest?.oauth2Credentials) {
        window.webContents.send('main:credentials-update', {...});
      }

      return { success: true };
    } catch (error) {
      // Error handling
    }
  });
```

**Key Function: prepareWsRequest**
```javascript
// Line 27-190
const prepareWsRequest = async (item, collection, environment, runtimeVariables, certsAndProxyConfig = {}) => {
  // 1. Merge collection-level headers, scripts, vars, auth
  // 2. Process OAuth2 if configured
  // 3. Interpolate all variables (including WebSocket message content)
  interpolateVars(wsRequest, envVars, runtimeVariables, processEnvVars);
  return wsRequest;
};
```

---

#### **Step 5: WsClient - Native WebSocket Connection**
**File:** `packages/bruno-requests/src/ws/ws-client.js`

```javascript
// Line 41-96
async startConnection({ request, collection, options = {} }) {
  const { url, headers } = request;
  const { timeout = 30000, keepAlive = false, keepAliveInterval = 10_000 } = options;

  // 1. Parse URL
  const parsedUrl = getParsedWsUrlObject(url);
  
  // 2. Extract protocols and version from headers
  const protocols = [].concat([headers['Sec-WebSocket-Protocol'], ...])
    .filter(Boolean)
    .map((d) => d.split(','))
    .flat().map((d) => d.trim());

  // 3. Create WebSocket options
  const wsOptions = {
    headers,
    handshakeTimeout: validTimeout,
    followRedirects: true
  };

  // 4. Create native WebSocket connection
  const wsConnection = new ws.WebSocket(parsedUrl.fullUrl, protocols, wsOptions);

  // 5. Set up event handlers (open, message, close, error, etc.)
  this.#setupWsEventHandlers(wsConnection, requestId, collectionUid, { keepAlive, keepAliveInterval });

  // 6. Store connection
  this.#addConnection(requestId, collectionUid, wsConnection);

  // 7. Emit connecting event
  this.eventCallback('main:ws:connecting', requestId, collectionUid);

  return wsConnection;
}
```

**Event Handlers Setup:**
```javascript
// Line 244-317
#setupWsEventHandlers(ws, requestId, collectionUid, options) {
  ws.on('open', () => {
    // Flush queued messages when connection opens
    this.#flushQueue(requestId, collectionUid);
    // Set up keep-alive if needed
    // Emit 'main:ws:open' event
  });
  
  ws.on('message', (data) => {
    // Parse incoming message
    // Emit 'main:ws:message' event with type: 'incoming'
  });
  
  ws.on('close', (code, reason) => {
    // Emit 'main:ws:close' event
    // Remove connection
  });
  
  ws.on('error', (error) => {
    // Emit 'main:ws:error' event
  });
}
```

---

#### **Step 6: Event Listeners (Renderer)**
**File:** `packages/bruno-app/src/utils/network/ws-event-listeners.js`

```javascript
// Line 7-111
const useWsEventListeners = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Listen for various WebSocket events from main process
    ipcRenderer.on('main:ws:request', (requestId, collectionUid, eventData) => {
      dispatch(runWsRequestEvent({...}));
    });

    ipcRenderer.on('main:ws:open', (requestId, collectionUid, eventData) => {
      dispatch(wsResponseReceived({...}));
    });

    ipcRenderer.on('main:ws:message', (requestId, collectionUid, eventData) => {
      dispatch(wsResponseReceived({...}));
    });
    
    // ... more event listeners
  }, []);
};
```

---

## Flow 2: Sending a Message

### Overview
This flow sends a message over an existing WebSocket connection. Messages are queued if the connection isn't open yet, and automatically sent when the connection opens.

---

### Flow Diagram

```
UI Component / Code
    ↓
Renderer Process (queueWsMessage / sendWsMessage)
    ↓
IPC Call (renderer:ws:queue-message / renderer:ws:send-message)
    ↓
Main Process (ws-event-handlers.js)
    ↓
WsClient.queueMessage() / WsClient.sendMessage()
    ↓
Native WebSocket.send()
```

---

### Detailed Step-by-Step Flow

#### **Step 1: UI Trigger**
**File:** `packages/bruno-app/src/components/RequestPane/WsBody/index.js` (or similar)

User clicks "Send" button on a message, or `sendWsRequest` is called to queue all messages.

---

#### **Step 2: Renderer Process - Queue Message**
**File:** `packages/bruno-app/src/utils/network/index.js`

**A. Queue Single/All Messages:**
```javascript
// Line 253-264
export const queueWsMessage = async (item, collection, environment, runtimeVariables, messageContent) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('renderer:ws:queue-message', {
      item,
      collection,
      environment,
      runtimeVariables,
      messageContent  // null = queue all, string = queue specific message
    }).then(resolve).catch(reject);
  });
};
```

**B. Send Message Directly (if connection is open):**
```javascript
// Line 316-321
export const sendWsMessage = async (item, collectionUid, message) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('renderer:ws:send-message', item.uid, collectionUid, message)
      .then(resolve).catch(reject);
  });
};
```

---

#### **Step 3: Main Process IPC Handler - Queue Message**
**File:** `packages/bruno-electron/src/ipc/network/ws-event-handlers.js`

```javascript
// Line 282-318
ipcMain.handle('renderer:ws:queue-message', 
  async (event, { item, collection, environment, runtimeVariables, messageContent }) => {
    try {
      // 1. Prepare request to interpolate variables
      const itemCopy = cloneDeep(item);
      const preparedRequest = await prepareWsRequest(itemCopy, collection, environment, runtimeVariables, {});
      
      // 2. Handle messageContent parameter
      if (messageContent !== undefined && messageContent !== null) {
        // Queue specific message (find it in prepared request)
        const originalMessages = itemCopy.draft?.request?.body?.ws || itemCopy.request?.body?.ws || [];
        const messageIndex = originalMessages.findIndex((msg) => msg.content === messageContent);
        
        if (messageIndex >= 0 && preparedRequest.body?.ws?.[messageIndex]) {
          // Queue the interpolated version
          wsClient.queueMessage(preparedRequest.uid, collection.uid, preparedRequest.body.ws[messageIndex].content);
        }
      } else {
        // Queue all messages (already interpolated)
        if (preparedRequest.body && preparedRequest.body.ws && Array.isArray(preparedRequest.body.ws)) {
          preparedRequest.body.ws
            .filter((message) => message && message.content)
            .forEach((message) => {
              wsClient.queueMessage(preparedRequest.uid, collection.uid, message.content);
            });
        }
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
```

**Send Message Handler:**
```javascript
// Line 320-329
ipcMain.handle('renderer:ws:send-message', (event, requestId, collectionUid, message) => {
  try {
    wsClient.sendMessage(requestId, collectionUid, message);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

---

#### **Step 4: WsClient - Queue/Send Message**
**File:** `packages/bruno-requests/src/ws/ws-client.js`

**A. Queue Message:**
```javascript
// Line 102-113
queueMessage(requestId, collectionUid, message) {
  const connectionMeta = this.activeConnections.get(requestId);
  
  // Add to message queue
  const mqKey = this.#getMessageQueueId(requestId);
  this.messageQueues[mqKey] ||= [];
  this.messageQueues[mqKey].push(message);

  // If connection is open, flush queue immediately
  if (connectionMeta && connectionMeta.connection && connectionMeta.connection.readyState === WebSocket.OPEN) {
    this.#flushQueue(requestId, collectionUid);
    return;
  }
  // Otherwise, message stays in queue until connection opens
}
```

**B. Flush Queue:**
```javascript
// Line 115-121
#flushQueue(requestId, collectionUid) {
  const mqKey = this.#getMessageQueueId(requestId);
  if (!(mqKey in this.messageQueues)) return;
  while (this.messageQueues[mqKey].length > 0) {
    this.sendMessage(requestId, collectionUid, this.messageQueues[mqKey].shift());
  }
}
```

**C. Send Message:**
```javascript
// Line 129-167
sendMessage(requestId, collectionUid, message) {
  const connectionMeta = this.activeConnections.get(requestId);

  if (connectionMeta.connection && connectionMeta.connection.readyState === WebSocket.OPEN) {
    let messageToSend;

    // Parse message if it's a string
    if (typeof message === 'string') {
      try {
        messageToSend = safeParseJSON(message, 'message content');
      } catch (parseError) {
        messageToSend = message; // Send as string if JSON parse fails
      }
    } else {
      messageToSend = message;
    }

    // Send via native WebSocket
    connectionMeta.connection.send(JSON.stringify(messageToSend), (error) => {
      if (error) {
        this.eventCallback('main:ws:error', requestId, collectionUid, { error });
      } else {
        // Emit outgoing message event
        this.eventCallback('main:ws:message', requestId, collectionUid, {
          message: messageToSend,
          messageHexdump: hexdump(JSON.stringify(messageToSend)),
          type: 'outgoing',
          timestamp: Date.now()
        });
      }
    });
  } else {
    // Connection not open - error
    const error = new Error('WebSocket connection not available or not open');
    this.eventCallback('main:ws:error', requestId, collectionUid, { error: error.message });
  }
}
```

---

#### **Step 5: Event Flow Back to Renderer**

When a message is sent successfully, `main:ws:message` event is emitted with `type: 'outgoing'`, which is caught by the event listeners in the renderer process and updates the UI.

---

## Key Differences Between Flows

| Aspect | Establishing Connection | Sending Message |
|--------|------------------------|-----------------|
| **Entry Point** | `connectWS()` or `sendWsRequest()` | `queueWsMessage()` or `sendWsMessage()` |
| **IPC Handler** | `renderer:ws:start-connection` | `renderer:ws:queue-message` or `renderer:ws:send-message` |
| **Main Process Function** | `wsClient.startConnection()` | `wsClient.queueMessage()` or `wsClient.sendMessage()` |
| **Variable Interpolation** | Done in `prepareWsRequest()` | Done in `prepareWsRequest()` before queuing |
| **Message Queueing** | Messages queued if `connectOnly: false` | Messages queued if connection not open |
| **Native WebSocket** | Creates new connection | Uses existing connection |

---

## Important Notes

1. **Variable Interpolation**: All WebSocket message content is interpolated in the main process via `prepareWsRequest()` → `interpolateVars()`, ensuring variables are resolved before sending.

2. **Message Queueing**: Messages are queued if:
   - Connection hasn't been established yet
   - Connection is not in `OPEN` state
   - Messages are automatically flushed when connection opens

3. **Connection Management**: Connections are stored in `WsClient.activeConnections` Map, keyed by `requestId` (item.uid).

4. **Event Flow**: All WebSocket events flow from main process → renderer process via IPC events (`main:ws:*`), which are handled by `useWsEventListeners()` hook.

5. **Error Handling**: Errors at any stage are propagated back through the promise chain and displayed to the user via toast notifications.

