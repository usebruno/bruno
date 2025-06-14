import { JSONPath } from 'jsonpath-plus';
import { decode } from '@msgpack/msgpack';
import iconv from 'iconv-lite';
import { safeParseXML, safeStringifyJSON } from 'utils/common/index';

export const formatResponse = (data, dataBuffer, encoding, mode, filter) => {
  if (data === undefined || !dataBuffer || !mode) {
    return '';
  }

  // TODO: We need a better way to get the raw response-data here instead
  // of using this dataBuffer param.
  // Also, we only need the raw response-data and content-type to show the preview.
  const rawData = iconv.decode(
    Buffer.from(dataBuffer, "base64"),
    iconv.encodingExists(encoding) ? encoding : "utf-8"
  );

  if (mode.includes('json')) {
    try {
      JSON.parse(rawData);
    } catch (error) {
      // If the response content-type is JSON and it fails parsing, its an invalid JSON.
      // In that case, just show the response as it is in the preview.
      return rawData;
    }

    if (filter) {
      try {
        data = JSONPath({ path: filter, json: data });
      } catch (e) {
        console.warn('Could not apply JSONPath filter:', e.message);
      }
    }

    return safeStringifyJSON(data, true);
  }

  if (mode.includes('xml')) {
    let parsed = safeParseXML(data, { collapseContent: true });
    if (typeof parsed === 'string') {
      return parsed;
    }
    return safeStringifyJSON(parsed, true);
  }

  if (mode.includes('msgpack')) {
    try {
      const decodedData = decode(Buffer.from(dataBuffer, "base64"));
      return safeStringifyJSON(decodedData, true);
    } catch (error) {
      console.warn('Error decoding msgpack data:', error);
      return rawData;
    }
  }

  if (typeof data === 'string') {
    return data;
  }

  return safeStringifyJSON(data, true);
};
