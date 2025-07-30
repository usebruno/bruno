import BodyBlock from "../Common/Body/index";
import Headers from "../Common/Headers/index";
import Status from "../Common/Status/index";

const safeStringifyJSONIfNotString = (obj) => {
  if (obj === null || obj === undefined) return '';

  if (typeof obj === 'string') {
    return obj;
  }

  try {
    return JSON.stringify(obj);
  } catch (e) {
    return '[Unserializable Object]';
  }
};

const Response = ({ collection, response, item }) => {
  let { status, statusCode, statusText, dataBuffer, headers, data, error } = response || {};
  if (!dataBuffer) {
    dataBuffer = Buffer.from(safeStringifyJSONIfNotString(data))?.toString('base64');
  }

  return (
    <div>
    {/* Status */}
    <div className="mb-1">
      <Status statusCode={status || statusCode} statusText={statusText} />
      {response.duration && <span className="text-sm text-gray-400 ml-2">{response.duration}ms</span>}
      {response.size && <span className="text-sm text-gray-400 ml-2">{response.size}B</span>}
    </div>

    {/* Headers */}
    <Headers headers={headers} type={'response'} />

    {/* Body */}
    <BodyBlock collection={collection} data={data} dataBuffer={dataBuffer} error={error} headers={headers} item={item} />
  </div>
  )
}

export default Response;