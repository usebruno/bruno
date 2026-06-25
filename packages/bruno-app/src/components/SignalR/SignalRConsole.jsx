import React from 'react';

export default function SignalRConsole({
  logs = []
}) {
  return (
    <pre>
      {
        JSON.stringify(logs, null, 2)
      }
    </pre>
  );
}
