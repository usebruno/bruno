import { useOrderedTimeline } from 'hooks/useSentHeaderRows';
import StyledWrapper from './StyledWrapper';

const Network = ({ logs, request, collection, item }) => {
  // Request headers render grouped by source, matching the request-headers table for the same request.
  const entries = useOrderedTimeline({ collection, item, request, timeline: logs });

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
