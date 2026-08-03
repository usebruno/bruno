import { sentHeadersFromTimeline } from '../../buildEntries';
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

const Request = ({ collection, request, item, response }) => {
  let { headers, data, dataBuffer, error } = request || {};

  const sentHeaders = sentHeadersFromTimeline(response?.timeline);
  const displayedHeaders = sentHeaders.length ? sentHeaders : headers;
  if (!dataBuffer) {
    dataBuffer = Buffer.from(safeStringifyJSONIfNotString(data))?.toString('base64');
  }

  return (
    <>
      <Headers headers={displayedHeaders} />
      <BodyBlock
        collection={collection}
        data={data}
        dataBuffer={dataBuffer}
        error={error}
        headers={headers}
        item={item}
        type="request"
      />
    </>
  );
};

export default Request;
