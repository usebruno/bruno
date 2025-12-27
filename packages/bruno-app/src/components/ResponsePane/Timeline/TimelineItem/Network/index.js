import React from 'react';

/**
 * Safely formats a message for display.
 * Handles the case where message might be an object (when safeStringifyJSON fails in backend).
 * Fixes issue #6505: HTTP response rendered as [object Object] in Timeline | Network Logs tab
 */
const formatMessage = (message) => {
  if (message === null || message === undefined) {
    return '';
  }
  if (typeof message === 'object') {
    try {
      return JSON.stringify(message, null, 2);
    } catch (e) {
      return '[Unable to display message]';
    }
  }
  return message;
};

const Network = ({ logs }) => {
  return (
    <div className="bg-black/5 text-white network-logs rounded overflow-auto h-96">
      <pre className="whitespace-pre-wrap">
        {logs.map((currentLog, index) => {
          if (index > 0 && currentLog?.type === 'separator') {
            return <div className="border-t-2 border-gray-500 w-full my-2" key={index} />;
          }
          const nextLog = logs[index + 1];
          const isSameLogType = nextLog?.type === currentLog?.type;
          return (
            <React.Fragment key={index}>
              <NetworkLogsEntry entry={currentLog} />
              {!isSameLogType && <div className="mt-4" />}
            </React.Fragment>
          );
        })}
      </pre>
    </div>
  );
};

const NetworkLogsEntry = ({ entry }) => {
  const { type, message } = entry;
  const displayMessage = formatMessage(message);
  let className = '';

  switch (type) {
    case 'request':
      className = 'text-blue-500';
      break;
    case 'response':
      className = 'text-green-500';
      break;
    case 'error':
      className = 'text-red-500';
      break;
    case 'tls':
      className = 'text-purple-500';
      break;
    case 'info':
      className = 'text-yellow-500';
      break;
    default:
      className = 'text-gray-400';
      break;
  }

  return (
    <div className={`${className}`}>
      <div>{displayMessage}</div>
    </div>
  );
};

export default Network;
