/**
 * Instead of using multer for example to parse the multipart form data, we build our own parser
 * so that we can verify the content type are set correctly by bruno (for example application/json for json content)
 */

const extractParam = function (param, str, delimiter, quote, endDelimiter) {
  let regex = new RegExp(`${param}${delimiter}\\s*${quote}(.*?)${quote}${endDelimiter}`);
  const found = str.match(regex);
  if (found != null && found.length > 1) {
    return found[1];
  } else {
    return null;
  }
};

const init = function (app, express) {
  app.use(express.raw({ type: 'multipart/form-data' }));
};

const parsePart = function (part) {
  let result = {};
  const name = extractParam('name', part, '=', '"', '');
  if (name) {
    result.name = name;
  }
  const filename = extractParam('filename', part, '=', '"', '');
  if (filename) {
    result.filename = filename;
  }
  const contentType = extractParam('Content-Type', part, ':', '', ';');
  if (contentType) {
    result.contentType = contentType;
  }
  if (!filename) {
    result.value = part.substring(part.indexOf('value=') + 'value='.length);
  }
  if (contentType === 'application/json') {
    result.value = JSON.parse(result.value);
  }
  return result;
};

const parse = function (req) {
  const BOUNDARY = 'boundary=';
  const contentType = req.headers['content-type'];
  const boundary = '--' + contentType.substring(contentType.indexOf(BOUNDARY) + BOUNDARY.length);
  const rawBody = req.body.toString();
  let parts = rawBody.split(boundary).filter((part) => part.length > 0);
  parts = parts.map((part) => part.trim('\r\n'));
  parts = parts.filter((part) => part != '--');
  parts = parts.map((part) => part.replace('\r\n\r\n', ';value='));
  parts = parts.map((part) => part.replace('\r\n', ';'));
  parts = parts.map((part) => parsePart(part));
  return parts;
};

module.exports.parse = parse;
module.exports.init = init;
