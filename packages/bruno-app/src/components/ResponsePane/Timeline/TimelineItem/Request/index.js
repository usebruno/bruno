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

const sortRequestHeaders = (headersObj) => {
  if (!headersObj || typeof headersObj !== 'object') return {};

  const topDefaults = [
    'Accept',
    'User-Agent',
    'request-start-time',
    'Accept-Encoding',
    'Host',
    'Connection'
  ];

  const topDefaultsLower = topDefaults.map((h) => h.toLowerCase());

  const sortedEntries = Object.entries(headersObj)
    .map(([key, value]) => {
      const lowerKey = key.toLowerCase();
      const defaultIndex = topDefaultsLower.indexOf(lowerKey);

      // Convert ONLY topDefaults keys to their formatted casing, keep rest untouched
      const formattedKey = defaultIndex !== -1 ? topDefaults[defaultIndex] : key;

      return [formattedKey, value];
    })
    .sort(([keyA], [keyB]) => {
      const lowerA = keyA.toLowerCase();
      const lowerB = keyB.toLowerCase();

      const indexA = topDefaultsLower.indexOf(lowerA);
      const indexB = topDefaultsLower.indexOf(lowerB);

      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      return lowerA.localeCompare(lowerB);
    });

  return Object.fromEntries(sortedEntries);
};

const Request = ({ collection, request, item, response, index }) => {
  let { headers, data, dataBuffer, error } = request || {};

  const rawRequestResponseHeaders = response?.data?.request?.Headers;
  const sortedRequestResponseDefaultHeaders = sortRequestHeaders(rawRequestResponseHeaders);
  const sortedRequestResponseAddedHeaders = collection.timeline[index].data.request.headers;

  let allHeaders = { ...sortedRequestResponseDefaultHeaders, ...sortedRequestResponseAddedHeaders };
  if (!dataBuffer) {
    dataBuffer = Buffer.from(safeStringifyJSONIfNotString(data))?.toString('base64');
  }

  return (
    <>
      <Headers headers={allHeaders} />
      <BodyBlock
        collection={collection}
        data={data}
        dataBuffer={dataBuffer}
        error={error}
        headers={sortedRequestResponseDefaultHeaders}
        item={item}
        type="request"
      />
    </>
  );
};

export default Request;
