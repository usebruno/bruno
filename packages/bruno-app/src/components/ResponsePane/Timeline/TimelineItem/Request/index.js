import Headers from '../Common/Headers/index';
import BodyBlock from '../Common/Body/index';
import { sentHeadersFromTimeline } from 'utils/timeline';

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
  /** In case of `bru.sendRequest` it builds its own entry in timeline,
   * so to show the headers sent in new request we need headers not sentHeaders */
  const displayedHeaders = sentHeaders.length ? sentHeaders : headers;
  if (!dataBuffer) {
    dataBuffer = Buffer.from(safeStringifyJSONIfNotString(data))?.toString('base64');
  }

  return (
    <>
      <Headers headers={displayedHeaders} variant="request" />
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
