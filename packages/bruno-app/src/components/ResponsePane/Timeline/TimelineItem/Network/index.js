import React from 'react';
import { IconCopy } from '@tabler/icons';
import toast from 'react-hot-toast';
import StyledWrapper from './StyledWrapper';

const NetworkLogsEntry = ({ entry }) => {
  const { type, message } = entry;
  let className = 'network-logs-entry';

  switch (type) {
    case 'request':
      className = 'network-logs-entry network-logs-entry--request';
      break;
    case 'response':
      className = 'network-logs-entry network-logs-entry--response';
      break;
    case 'error':
      className = 'network-logs-entry network-logs-entry--error';
      break;
    case 'tls':
      className = 'network-logs-entry network-logs-entry--tls';
      break;
    case 'info':
      className = 'network-logs-entry network-logs-entry--info';
      break;
    default:
      className = 'network-logs-entry';
      break;
  }

  return (
    <div className={className}>
      <div>{message}</div>
    </div>
  );
};

const Network = ({ logs, showCopy = false }) => {
  const networkLogs = Array.isArray(logs) ? logs : [];
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(networkLogs
        .map((entry) => (entry?.type === 'separator' ? '' : entry?.message ?? String(entry)))
        .join('\n'));
      toast.success('Network logs copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy network logs');
    }
  };

  return (
    <StyledWrapper>
      {showCopy && (
        <div className="network-logs-header">
          <h4>Network Logs</h4>
          <button
            className="copy-button"
            type="button"
            onClick={handleCopy}
            disabled={networkLogs.length === 0}
          >
            <IconCopy size={16} strokeWidth={2} />
            Copy
          </button>
        </div>
      )}
      <div className="network-logs-container">
        <pre className="network-logs-pre">
          {networkLogs.map((currentLog, index) => {
            if (index > 0 && currentLog?.type === 'separator') {
              return <div className="network-logs-separator" key={index} />;
            }
            const nextLog = logs[index + 1];
            const isSameLogType = nextLog?.type === currentLog?.type;
            return (
              <div key={index}>
                <NetworkLogsEntry entry={currentLog} />
                {!isSameLogType && <div className="network-logs-spacing" />}
              </div>
            );
          })}
        </pre>
      </div>
    </StyledWrapper>
  );
};

export default Network;
