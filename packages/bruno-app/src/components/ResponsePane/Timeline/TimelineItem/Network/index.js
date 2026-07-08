import StyledWrapper from './StyledWrapper';
import { buildHeaderSections, flattenHeaderSections } from '@usebruno/common/utils';
import { useMemo } from 'react';
import { getTreePathFromCollectionToItem } from 'utils/collections/index';

const headerNameOf = (entry) => {
  const idx = typeof entry?.message === 'string' ? entry.message.indexOf(':') : -1;
  return idx === -1 ? '' : entry.message.slice(0, idx).trim().toLowerCase();
};

const sortRequestHeaderLogs = (logs, { request, collection, item }) => {
  if (!Array.isArray(logs) || !(request || item || collection)) return logs || [];
  const treePath = getTreePathFromCollectionToItem(collection, item);
  const rows = flattenHeaderSections(buildHeaderSections({ collection, item, treePath, request, timeline: logs }));
  if (!rows.length) return logs;

  const orderByName = new Map();
  rows.forEach((row, i) => {
    const key = String(row.name ?? '').trim().toLowerCase();
    if (key && !orderByName.has(key)) orderByName.set(key, i);
  });

  const slots = [];
  logs.forEach((log, i) => {
    if (log?.type === 'requestHeader') slots.push(i);
  });
  if (slots.length < 2) return logs;

  const rank = (entry) => {
    const r = orderByName.get(headerNameOf(entry));
    return r === undefined ? Number.MAX_SAFE_INTEGER : r;
  };
  const sorted = slots.map((i) => logs[i]).sort((a, b) => rank(a) - rank(b));

  const result = [...logs];
  slots.forEach((slot, k) => {
    result[slot] = sorted[k];
  });
  return result;
};

const Network = ({ logs, request, collection, item }) => {
  const orderedLogs = useMemo(
    () => sortRequestHeaderLogs(logs, { request, collection, item }),
    [logs, request, collection, item]
  );

  return (
    <StyledWrapper>
      <div className="network-logs-container">
        <pre className="network-logs-pre">
          {orderedLogs.map((currentLog, index) => {
            if (index > 0 && currentLog?.type === 'separator') {
              return <div className="network-logs-separator" key={index} />;
            }
            const nextLog = orderedLogs[index + 1];
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
