import React, { useState, useRef } from 'react';
import { createSignalRConnection } from 'utils/signalr/signalr-client';
import SignalRConsole from './SignalRConsole';

export default function SignalRRequest() {
  const [url, setUrl] = useState('');
  const [connection, setConnection] = useState(null);
  const [logs, setLogs] = useState([]);
  const isConnectingRef = useRef(false);
  async function connect() {
    if (connection || isConnectingRef.current) return;
    isConnectingRef.current = true;
    const conn = createSignalRConnection({
      url
    });
    conn.on('ReceiveMessage', (...arg) => {
      setLogs((prevLogs) => [...prevLogs, { type: 'ReceiveMessage', data: arg }]);
    });
    try {
      await conn.start();
      setConnection(conn);
      setLogs((prev) => [...prev, { event: 'SYSTEM', data: 'Connected' }]);
    } catch (err) {
      setLogs((prev) => [...prev, { event: 'SYSTEM', data: `Connection failed: ${err?.message || err}` }]);
    } finally {
      isConnectingRef.current = false;
    }
  }
  async function disconnect() {
    if (connection) {
      await connection.stop();
      setConnection(null);
      setLogs((prev) => [...prev, { event: 'SYSTEM', data: 'Disconnected' }]);
    }
  }
  return (
    <div>
      <h2>
        SignalR
      </h2>
      <input
        type="text"
        placeholder="SignalR URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <button onClick={connect}>Connect</button>
      <button onClick={disconnect}>Disconnect</button>
      <SignalRConsole logs={logs} />
    </div>
  );
}
