import { useTranslation } from 'react-i18next';
import Headers from '../Common/Headers/index';
import BodyBlock from '../Common/Body/index';

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

const Request = ({ collection, request, item }) => {
  const { t } = useTranslation();
  let { url, headers, data, dataBuffer, error } = request || {};
  if (!dataBuffer) {
    const stringified = safeStringifyJSONIfNotString(data);
    dataBuffer = stringified ? Buffer.from(stringified)?.toString('base64') : null;
  }
  if (!dataBuffer && data !== null && data !== undefined && typeof data !== 'string') {
    data = t('TIMELINE.UNSERIALIZABLE_OBJECT');
  }

  return (
    <div>
      {/* Method and URL */}
      <div className="mb-1 flex gap-2">
        <pre className="whitespace-pre-wrap" title={url}>{url}</pre>
      </div>

      {/* Headers */}
      <Headers headers={headers} type="request" />

      {/* Body */}
      <BodyBlock collection={collection} data={data} dataBuffer={dataBuffer} error={error} headers={headers} item={item} type="request" />
    </div>
  );
};

export default Request;
