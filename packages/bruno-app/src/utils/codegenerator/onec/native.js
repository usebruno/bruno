import { platform } from './keywords';
import {
  quote,
  isJsonMime,
  prettyJsonBodyText,
  assignStringBody,
  stringBodyVariable,
  isFormUrlEncoded,
  formUrlEncodedText,
  isMultipart,
  isMultiline,
  parseRequestUrl,
  declareMap,
  multilineStringAssign,
  responseOutputLines,
  joinLines,
  multipartParams,
  appendMultipartBody,
  withoutContentType,
  contentTypeMultipartExpression,
  fileBodyParam,
  collectClientFilePaths,
  describeClientFiles,
  wrapWithClientFileTransfer
} from './bsl';

const variableNames = {
  ru: {
    headers: 'Заголовки',
    secureConnection: 'ЗащищенноеСоединение',
    connection: 'Соединение',
    request: 'HTTPЗапрос',
    response: 'HTTPОтвет',
    bodyText: 'ТекстТела'
  },
  en: {
    headers: 'Headers',
    secureConnection: 'SecureConnection',
    connection: 'Connection',
    request: 'HTTPRequest',
    response: 'HTTPResponse',
    bodyText: 'BodyText'
  }
};

const convertNative = (request = {}, lang) => {
  const kw = platform[lang];
  const names = variableNames[lang];
  const parsedUrl = parseRequestUrl(request.fullUrl || request.url || '');
  const headers = request.allHeaders || request.headersObj || {};
  let headerEntries = Object.entries(headers);
  const postData = request.postData || {};
  const method = String(request.method || 'GET').toUpperCase();
  const parts = multipartParams(postData);
  const useMultipartWriter = isMultipart(postData.mimeType) && parts.length > 0;
  const fileBody = fileBodyParam(postData);
  const files = describeClientFiles(collectClientFilePaths(postData), lang);
  const lines = [];
  let multipartNames;

  if (fileBody && !headerEntries.some(([name]) => String(name).toLowerCase() === 'content-type')) {
    headerEntries = [...headerEntries, ['Content-Type', fileBody.contentType]];
  }
  if (isJsonMime(postData.mimeType) && !headerEntries.some(([name]) => String(name).toLowerCase() === 'content-type')) {
    headerEntries = [...headerEntries, ['Content-Type', postData.mimeType || 'application/json']];
  }

  if (useMultipartWriter) {
    multipartNames = appendMultipartBody(lines, parts, lang, files);
    lines.push('');
  }

  const visibleHeaders = useMultipartWriter ? withoutContentType(headerEntries) : headerEntries;
  if (visibleHeaders.length || useMultipartWriter) {
    const headerLines = declareMap(names.headers, visibleHeaders, lang);
    if (useMultipartWriter) {
      headerLines.push(
        `${names.headers}.${kw.Insert}("Content-Type", ${contentTypeMultipartExpression(multipartNames.boundary)});`
      );
    }
    lines.push(...headerLines, '');
  }

  if (parsedUrl.isHttps) {
    lines.push(
      `${names.secureConnection} = ${kw.New} ${kw.OpenSSLSecureConnection};`,
      `${names.connection} = ${kw.New} ${kw.HTTPConnection}(${quote(parsedUrl.host)}, ${
        parsedUrl.port
      }, , , , 30, ${names.secureConnection});`,
      ''
    );
  } else {
    lines.push(
      `${names.connection} = ${kw.New} ${kw.HTTPConnection}(${quote(parsedUrl.host)}, ${parsedUrl.port}, , , , 30);`,
      ''
    );
  }

  const hasHeaders = visibleHeaders.length > 0 || useMultipartWriter;
  const requestArguments = hasHeaders
    ? `${quote(parsedUrl.path)}, ${names.headers}`
    : quote(parsedUrl.path);
  lines.push(`${names.request} = ${kw.New} ${kw.HTTPRequest}(${requestArguments});`);

  if (useMultipartWriter) {
    lines.push(`${names.request}.${kw.SetBodyFromBinaryData}(${multipartNames.bodyData});`);
  } else if (fileBody && files[0]) {
    lines.push(`${names.request}.${kw.SetBodyFromBinaryData}(${files[0].dataVar});`);
  } else {
    if (isJsonMime(postData.mimeType)) {
      const jsonText = prettyJsonBodyText(postData);
      if (jsonText !== undefined) {
        lines.push('');
        lines.push(...assignStringBody(jsonText, lang));
        lines.push(`${names.request}.${kw.SetBodyFromString}(${stringBodyVariable[lang]});`);
      }
    } else {
      const rawText = isFormUrlEncoded(postData.mimeType)
        ? formUrlEncodedText(postData)
        : (postData.text !== undefined && postData.text !== null && String(postData.text).length
            ? String(postData.text)
            : undefined);

      if (rawText !== undefined) {
        if (isMultiline(rawText)) {
          lines.push('');
          lines.push(...multilineStringAssign(names.bodyText, rawText));
          lines.push(`${names.request}.${kw.SetBodyFromString}(${names.bodyText});`);
        } else {
          lines.push(`${names.request}.${kw.SetBodyFromString}(${quote(rawText)});`);
        }
      }
    }
  }

  lines.push(
    '',
    `${names.response} = ${names.connection}.${kw.CallHTTPMethod}(${quote(method)}, ${names.request});`,
    '',
    ...responseOutputLines({
      lang,
      statusExpression: `${names.response}.${kw.StatusCode}`,
      textExpression: `${names.response}.${kw.GetBodyAsString}()`
    })
  );

  return wrapWithClientFileTransfer(lines, files, lang);
};

const link = 'https://1c-dn.com/library/html/7ebc2431-4d0c-4d5b-8c0a-36c0bdc8c0c0.htm';

export const nativeRu = {
  info: {
    key: 'native-ru',
    title: 'Native (RU)',
    link,
    description: '1C:Enterprise native HTTPConnection'
  },
  convert: (request) => convertNative(request, 'ru')
};

export const nativeEn = {
  info: {
    key: 'native-en',
    title: 'Native (EN)',
    link,
    description: '1C:Enterprise native HTTPConnection'
  },
  convert: (request) => convertNative(request, 'en')
};
