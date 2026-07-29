import StyledWrapper from './StyledWrapper';

// The network log is a wire trace: entries render in the order they were serialized, so it can be
// compared line-for-line against a packet capture. Source grouping belongs to the Request tab's
// header table, which reads the same timeline.
//
// The two describe different scopes on purpose. A request that took more than one hop — a followed
// redirect, or a digest/NTLM auth retry — accumulates every hop here, while the Request tab shows
// only the hop that produced the response being viewed. So this log is a superset for multi-hop
// requests; the two agree hop-for-hop, not line-for-line.
const Network = ({ logs }) => {
  const entries = Array.isArray(logs) ? logs : [];

  return (
    <StyledWrapper>
      <div className="network-logs-container">
        <pre className="network-logs-pre">
          {entries.map((currentLog, index) => {
            if (index > 0 && currentLog?.type === 'separator') {
              return <div className="network-logs-separator" key={index} />;
            }
            const nextLog = entries[index + 1];
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
    <div className={className} data-testid="network-log-entry" data-log-type={type}>
      <div>{message}</div>
    </div>
  );
};

export default Network;
