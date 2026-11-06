import { opi as opiKw } from './keywords';
import {
  quote,
  literal,
  isJsonMime,
  prettyJsonBodyText,
  assignStringBody,
  stringBodyVariable,
  isFormUrlEncoded,
  isMultipart,
  getHeader,
  toEntries,
  objectEntries,
  formFieldEntries,
  hasDuplicateKeys,
  formUrlEncodedText,
  withoutQueryString,
  declareStructure,
  multilineStringAssign,
  responseOutputLines,
  joinLines,
  multipartParams,
  appendMultipartBody,
  contentTypeMultipartExpression,
  fileBodyParam,
  collectClientFilePaths,
  describeClientFiles,
  wrapWithClientFileTransfer
} from './bsl';

const getHeaders = (request) => {
  const allHeaders = request.allHeaders;
  if (Array.isArray(allHeaders) ? allHeaders.length : objectEntries(allHeaders).length) {
    return toEntries(allHeaders);
  }

  return toEntries(request.headersObj || {});
};

const getMimeType = (postData, headers) => {
  const contentType = getHeader(Object.fromEntries(headers), 'Content-Type');
  return postData?.mimeType || contentType?.value || '';
};

const addBody = (lines, chain, postData, mimeType, lang, files = []) => {
  if (!postData) {
    return { managesContentType: false };
  }

  const kw = opiKw[lang];
  const fileBody = fileBodyParam(postData);

  if (isJsonMime(mimeType)) {
    const jsonText = prettyJsonBodyText(postData);
    if (jsonText !== undefined) {
      lines.push(...assignStringBody(jsonText, lang), '');
      chain.push(`${kw.setStringBody}(${stringBodyVariable[lang]})`);
      return { managesContentType: false };
    }
  }

  if (isFormUrlEncoded(mimeType)) {
    const formEntries = formFieldEntries(postData);
    if (formEntries.length && !hasDuplicateKeys(formEntries)) {
      lines.push(...declareStructure(kw.data, formEntries, lang), '');
      chain.push(`${kw.setFormBody}(${kw.data})`);
      return { managesContentType: true };
    }

    const formText = formUrlEncodedText(postData);
    if (formText !== undefined) {
      lines.push(...multilineStringAssign(kw.data, formText), '');
      chain.push(`${kw.setStringBody}(${kw.data})`);
      return { managesContentType: false };
    }
  }

  if (isMultipart(mimeType)) {
    const parts = multipartParams(postData);
    if (parts.length) {
      // OPI has no per-file upload method. Every part, including extra files, is packed into one binary body.
      const names = appendMultipartBody(lines, parts, lang, files);
      const fileParts = parts.filter((part) => part.fileName);
      if (fileParts.length > 1) {
        lines.push(lang === 'ru'
          ? '// OPI: несколько файлов уходят одним двоичным multipart-телом, отдельного метода на каждый файл нет.'
          : '// OPI: multiple files are sent as one binary multipart body; there is no per-file method.');
      }
      lines.push('');
      chain.push(`${kw.setBinaryBody}(${names.bodyData})`);
      return {
        managesContentType: true,
        contentTypeExpression: contentTypeMultipartExpression(names.boundary)
      };
    }
  }

  if (fileBody && files[0]) {
    chain.push(`${kw.setBinaryBody}(${files[0].dataVar})`);
    return { managesContentType: false };
  }

  if (postData.text) {
    chain.push(`${kw.setStringBody}(${literal(postData.text, lang)})`);
  }

  return { managesContentType: false };
};

const addHeaders = (chain, headers, body, lang) => {
  const kw = opiKw[lang];

  headers.forEach(([name, value]) => {
    if (body.managesContentType && String(name).toLowerCase() === 'content-type') {
      return;
    }

    const bearerMatch = String(value).match(/^Bearer\s+(.+)$/i);
    if (String(name).toLowerCase() === 'authorization' && bearerMatch) {
      chain.push(`${kw.addBearerAuthorization}(${literal(bearerMatch[1], lang)})`);
      return;
    }

    chain.push(`${kw.addHeader}(${quote(name)}, ${literal(value, lang)})`);
  });

  if (body.contentTypeExpression) {
    chain.push(`${kw.addHeader}("Content-Type", ${body.contentTypeExpression})`);
  }
};

const convertOpi = (request = {}, lang) => {
  const kw = opiKw[lang];
  const lines = [];
  const chain = [];
  const queryEntries = toEntries(request.queryObj || {});
  const fullUrl = request.fullUrl || request.url || '';
  const initializeUrl = queryEntries.length ? withoutQueryString(fullUrl) : fullUrl;
  const headers = getHeaders(request);
  const mimeType = getMimeType(request.postData, headers);
  const files = describeClientFiles(collectClientFilePaths(request.postData), lang);
  const fileBody = fileBodyParam(request.postData);
  if (fileBody && !getHeader(Object.fromEntries(headers), 'Content-Type')) {
    headers.push(['Content-Type', fileBody.contentType]);
  }
  if (isJsonMime(mimeType) && !getHeader(Object.fromEntries(headers), 'Content-Type')) {
    headers.push(['Content-Type', request.postData?.mimeType || 'application/json']);
  }

  if (queryEntries.length) {
    lines.push(...declareStructure(kw.params, queryEntries, lang), '');
  }

  chain.push(`${kw.initialize}(${quote(initializeUrl)})`);
  if (queryEntries.length) {
    chain.push(`${kw.setUrlParams}(${kw.params})`);
  }

  const body = addBody(lines, chain, request.postData, mimeType, lang, files);
  addHeaders(chain, headers, body, lang);

  chain.push(`${kw.processRequest}(${quote(String(request.method || 'GET').toUpperCase())})`);

  const fluentLines = [
    `${kw.result} = ${kw.module}.${kw.newRequest}()`,
    ...chain.map((method, index) => `\t.${method}${index === chain.length - 1 ? ';' : ''}`)
  ];

  lines.push(...fluentLines, '');
  lines.push(
    ...responseOutputLines({
      lang,
      statusExpression: `${kw.result}.${kw.returnStatusCode}()`,
      textExpression: `${kw.result}.${kw.returnText}()`
    })
  );
  return wrapWithClientFileTransfer(lines, files, lang);
};

export const opiRu = {
  info: {
    key: 'opi-ru',
    title: 'OPI (RU)',
    link: 'https://openintegrations.dev/docs/Instructions/HTTP',
    description: 'Open Integrations Package HTTP client'
  },
  convert: (request) => convertOpi(request, 'ru')
};

export const opiEn = {
  info: {
    key: 'opi-en',
    title: 'OPI (EN)',
    link: 'https://en.openintegrations.dev/docs/Instructions/HTTP',
    description: 'Open Integrations Package HTTP client'
  },
  convert: (request) => convertOpi(request, 'en')
};
