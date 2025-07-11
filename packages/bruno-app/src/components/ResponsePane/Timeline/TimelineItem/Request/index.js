import Headers from "../Common/Headers/index";
import BodyBlock from "../Common/Body/index";

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


const Request = ({ collection, request, item }) => {
  let { url, headers, data, dataBuffer, error } = request || {};  
  if (!dataBuffer) {
    dataBuffer = Buffer.from(safeStringifyJSONIfNotString(data))?.toString('base64');
  }

  return (
    <div>
      {/* Method and URL */}
      <div className="mb-1 flex gap-2">
        <pre className="whitespace-pre-wrap">{url}</pre>
      </div>

      {/* Headers */}
      <Headers headers={headers} type={'request'} />

      {/* Body */}
      <BodyBlock collection={collection} data={data} dataBuffer={dataBuffer} error={error} headers={headers} item={item} />
  </div>
  )
}

export default Request;