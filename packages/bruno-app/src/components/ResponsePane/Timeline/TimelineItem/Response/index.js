import { useTranslation } from 'react-i18next';
import BodyBlock from '../Common/Body/index';
import Headers from '../Common/Headers/index';
import Status from '../Common/Status/index';

const safeStringifyJSONIfNotString = (obj) => {
  if (obj === null || obj === undefined) return '';

  if (typeof obj === 'string') {
    return obj;
  }

  try {
    return JSON.stringify(obj);
  } catch (e) {
    return null;
  }
};

const Response = ({ collection, response, item }) => {
  const { t } = useTranslation();
  let { status, statusCode, statusText, dataBuffer, headers, data, error } = response || {};
  if (!dataBuffer) {
    const stringified = safeStringifyJSONIfNotString(data);
    dataBuffer = stringified ? Buffer.from(stringified)?.toString('base64') : null;
  }
  if (!dataBuffer && data !== null && data !== undefined && typeof data !== 'string') {
    data = t('TIMELINE.UNSERIALIZABLE_OBJECT');
  }

  return (
    <div>
      {/* Status */}
      <div className="mb-1">
        <Status statusCode={status || statusCode} statusText={statusText} />
        {response.duration && <span className="timeline-item-metadata">{response.duration}ms</span>}
        {response.size && <span className="timeline-item-metadata">{response.size}B</span>}
      </div>

      {/* Headers */}
      <Headers headers={headers} type="response" />

      {/* Body */}
      <BodyBlock collection={collection} data={data} dataBuffer={dataBuffer} error={error} headers={headers} item={item} type="response" />
    </div>
  );
};

export default Response;
