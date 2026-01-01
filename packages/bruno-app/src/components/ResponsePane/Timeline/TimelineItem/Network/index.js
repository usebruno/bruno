import StyledWrapper from './StyledWrapper';

const Network = ({ logs, fontVariant = 'base', padding = false, height = '24rem' }) => {
  return (
    <StyledWrapper fontVariant={fontVariant} padding={padding} height={height}>
      <div className="network-logs-container">
        <pre className="network-logs-pre">
          {logs.map((currentLog, index) => {
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

export default Network;
