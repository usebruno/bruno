import { useMemo } from 'react';
import { getTreePathFromCollectionToItem } from 'utils/collections/index';
import { buildHeaderRows } from '@usebruno/common/utils';
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

const Request = ({ collection, request, item, timeline }) => {
  let { headers, data, dataBuffer, error } = request || {};
  if (!dataBuffer) {
    dataBuffer = Buffer.from(safeStringifyJSONIfNotString(data))?.toString('base64');
  }

  const headerRows = useMemo(
    () => buildHeaderRows({ collection, item, treePath: getTreePathFromCollectionToItem(collection, item), request, timeline }),
    [collection, item, request, timeline]
  );

  return (
    <>
      <Headers rows={headerRows} />
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
