import BodyBlock from "../Common/Body/index";
import Headers from "../Common/Headers/index";
import Status from "../Common/Status/index";
import { safeStringifyJSONIfNotString } from "utils/common/index";

const Response = ({ collection, response, item, width }) => {
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
    <BodyBlock collection={collection} data={data} dataBuffer={dataBuffer} error={error} headers={headers} item={item} width={width} />
  </div>
  )
}

export default Response;