import { useTheme } from 'providers/Theme';
import BodyBlock from '../Common/Body/index';
import Headers from '../Common/Headers/index';

const safeStringifyJSONIfNotString = (obj) => {
  if (obj === null || obj === undefined) return '';
  if (typeof obj === 'string') return obj;
  try {
    return JSON.stringify(obj);
  } catch (e) {
    return '[Unserializable Object]';
  }
};

const formatBytes = (n) => {
  if (typeof n !== 'number' || !isFinite(n) || n < 0) return null;
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / (1024 * 1024)).toFixed(2)}MB`;
};

const statusColor = (theme, statusCode) => {
  if (statusCode >= 200 && statusCode < 300) return theme.requestTabPanel.responseOk;
  if (statusCode >= 300 && statusCode < 400) return theme.colors.text.warning;
  if (statusCode >= 400 && statusCode < 600) return theme.requestTabPanel.responseError;
  return theme.colors.text.muted;
};

// Main-request entries use `status`; scripted entries use `statusCode`.
const ResponseMeta = ({ code, statusText, duration, size }) => {
  const { theme } = useTheme();
  const sizeLabel = formatBytes(size);
  const hasAny = code || statusText || (typeof duration === 'number') || sizeLabel;
  if (!hasAny) return null;
  return (
    <div className="tl-response-meta">
      {(code || statusText) && (
        <span className="tl-response-meta-status" style={{ color: statusColor(theme, code) }}>
          {code} {statusText || ''}
        </span>
      )}
      {typeof duration === 'number' && (
        <span className="tl-response-meta-item">{Math.round(duration)}ms</span>
      )}
      {sizeLabel && <span className="tl-response-meta-item">{sizeLabel}</span>}
    </div>
  );
};

const Response = ({ collection, response, item }) => {
  let { status, statusCode, statusText, dataBuffer, headers, data, error, duration, size } = response || {};
  if (!dataBuffer) {
    dataBuffer = Buffer.from(safeStringifyJSONIfNotString(data))?.toString('base64');
  }

  return (
    <>
      <ResponseMeta
        code={statusCode ?? status}
        statusText={statusText}
        duration={duration}
        size={size}
      />
      <Headers headers={headers} />
      <BodyBlock
        collection={collection}
        data={data}
        dataBuffer={dataBuffer}
        error={error}
        headers={headers}
        item={item}
        type="response"
      />
    </>
  );
};

export default Response;
