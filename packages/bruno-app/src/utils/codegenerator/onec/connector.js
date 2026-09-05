import { platform, connector as connectorKw } from './keywords';
import {
  quote,
  isJsonMime,
  prettyJsonBodyText,
  assignStringBody,
  stringBodyVariable,
  isFormUrlEncoded,
  isMultipart,
  objectEntries,
  namedEntries,
  formFieldEntries,
  hasDuplicateKeys,
  formUrlEncodedText,
  withoutQueryString,
  withoutContentType,
  declareMap,
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

const requestHeaders = (request) => {
  const allHeaders = request.allHeaders;
  if (Array.isArray(allHeaders)) {
    return namedEntries(allHeaders);
  }
  if (allHeaders && typeof allHeaders === 'object' && Object.keys(allHeaders).length) {
    return Object.entries(allHeaders);
  }

  const headers = request.headersObj;
  return Array.isArray(headers) ? namedEntries(headers) : objectEntries(headers);
};

const CONNECTOR_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'MKCOL'];

const connectorMethodName = (method) => {
  if (method === 'MKCOL') {
    return 'Mkcol';
  }

  return `${method.charAt(0)}${method.slice(1).toLowerCase()}`;
};

const methodHasDataArgument = (method) => {
  return ['POST', 'PUT', 'PATCH', 'DELETE', 'MKCOL'].includes(method);
};

const exportCallHTTPMethodComment = (method, lang, moduleName, callName) => {
  if (lang === 'ru') {
    return `// Сделайте экспортной ${moduleName}.${callName} и вызовите её для метода ${method}.`;
  }

  return `// Export ${moduleName}.${callName} and call it for the ${method} method.`;
};

const appendSection = (lines, section) => {
  if (!section.length) {
    return;
  }

  if (lines.length) {
    lines.push('');
  }
  lines.push(...section);
};

const convertConnector = (request = {}, lang) => {
  const kw = platform[lang];
  const connector = connectorKw[lang];
  const method = String(request.method || 'GET').toUpperCase();
  const fullUrl = request.fullUrl || request.url || '';
  const postData = request.postData || {};
  const jsonText = isJsonMime(postData.mimeType) ? prettyJsonBodyText(postData) : undefined;
  const hasJsonBody = jsonText !== undefined;
  const methodIsSupported = CONNECTOR_METHODS.includes(method);
  const methodName = connectorMethodName(method);
  const queryAsSecondArgument = method === 'GET';
  const lines = [];
  const parts = multipartParams(postData);
  const useMultipart = isMultipart(postData.mimeType) && parts.length > 0;
  const fileBody = fileBodyParam(postData);
  const files = describeClientFiles(collectClientFilePaths(postData), lang);
  let multipartNames;

  if (useMultipart) {
    multipartNames = appendMultipartBody(lines, parts, lang, files);
  }

  let headers = useMultipart
    ? withoutContentType(requestHeaders(request))
    : requestHeaders(request);
  if (fileBody && !headers.some(([name]) => String(name).toLowerCase() === 'content-type')) {
    headers = [...headers, ['Content-Type', fileBody.contentType]];
  }
  if (isJsonMime(postData.mimeType) && !headers.some(([name]) => String(name).toLowerCase() === 'content-type')) {
    headers = [...headers, ['Content-Type', postData.mimeType || 'application/json']];
  }

  const queryEntries = objectEntries(request.queryObj);
  const queryInAdditionalParameters = queryEntries.length > 0 && !queryAsSecondArgument;
  const hasAdditionalParameters = headers.length > 0 || queryInAdditionalParameters || useMultipart;

  if (headers.length || useMultipart) {
    const headerLines = declareMap(connector.headers, headers, lang);
    if (useMultipart) {
      headerLines.push(
        `${connector.headers}.${kw.Insert}("Content-Type", ${contentTypeMultipartExpression(multipartNames.boundary)});`
      );
    }
    appendSection(lines, headerLines);
  }

  if (queryEntries.length) {
    appendSection(lines, declareStructure(connector.queryParameters, queryEntries, lang));
  }

  let dataArgument = kw.Undefined;
  const dataLines = [];
  if (useMultipart) {
    dataArgument = multipartNames.bodyData;
  } else if (fileBody && files[0]) {
    dataArgument = files[0].dataVar;
  } else if (hasJsonBody && !queryAsSecondArgument) {
    dataLines.push(...assignStringBody(jsonText, lang));
    dataArgument = stringBodyVariable[lang];
  } else if (isFormUrlEncoded(postData.mimeType)) {
    const parameters = formFieldEntries(postData);
    if (parameters.length && !hasDuplicateKeys(parameters)) {
      dataLines.push(...declareStructure(connector.data, parameters, lang));
      dataArgument = connector.data;
    } else {
      const formText = formUrlEncodedText(postData);
      if (formText !== undefined) {
        dataLines.push(...multilineStringAssign(connector.data, formText));
        dataArgument = connector.data;
      }
    }
  } else if (postData.text) {
    dataLines.push(...multilineStringAssign(connector.data, postData.text));
    dataArgument = connector.data;
  }

  appendSection(lines, dataLines);

  const useGenericCall = !methodIsSupported;
  const needsAdditionalParameters = hasAdditionalParameters
    || (useGenericCall && dataArgument !== kw.Undefined);

  if (needsAdditionalParameters) {
    const extraLines = [
      `${connector.additionalParameters} = ${kw.New} ${kw.Structure};`
    ];
    if (headers.length || useMultipart) {
      extraLines.push(
        `${connector.additionalParameters}.${kw.Insert}(${quote(connector.headers)}, ${connector.headers});`
      );
    }
    if (queryInAdditionalParameters) {
      extraLines.push(
        `${connector.additionalParameters}.${kw.Insert}(${quote(connector.queryParameters)}, ${connector.queryParameters});`
      );
    }
    if (useGenericCall && dataArgument !== kw.Undefined) {
      extraLines.push(
        `${connector.additionalParameters}.${kw.Insert}(${quote(connector.data)}, ${dataArgument});`
      );
    }
    appendSection(lines, extraLines);
  }

  const callUrl = queryEntries.length ? withoutQueryString(fullUrl) : fullUrl;
  const callLines = [];
  if (useGenericCall) {
    callLines.push(
      exportCallHTTPMethodComment(method, lang, connector.module, connector.callHTTPMethod)
    );
    const genericArguments = [
      kw.Undefined,
      quote(method),
      quote(callUrl),
      needsAdditionalParameters ? connector.additionalParameters : kw.Undefined
    ];
    callLines.push(
      `${connector.result} = ${connector.module}.${connector.callHTTPMethod}(${genericArguments.join(', ')});`
    );
  } else {
    const argumentsList = [quote(callUrl)];

    if (queryAsSecondArgument) {
      if (queryEntries.length || needsAdditionalParameters) {
        argumentsList.push(queryEntries.length ? connector.queryParameters : kw.Undefined);
      }
    } else if (methodHasDataArgument(method) && (dataArgument !== kw.Undefined || needsAdditionalParameters)) {
      argumentsList.push(dataArgument);
    }

    if (needsAdditionalParameters) {
      argumentsList.push(connector.additionalParameters);
    }

    callLines.push(
      `${connector.result} = ${connector.module}.${methodName}(${argumentsList.join(', ')});`
    );
  }

  callLines.push(
    '',
    ...responseOutputLines({
      lang,
      statusExpression: `${connector.result}.${kw.StatusCode}`,
      textExpression: `${connector.module}.${connector.asText}(${connector.result})`
    })
  );
  appendSection(lines, callLines);

  return wrapWithClientFileTransfer(lines, files, lang);
};

export const connectorRu = {
  info: {
    key: 'connector-ru',
    title: 'Connector (RU)',
    link: 'https://github.com/vbondarevsky/Connector',
    description: 'КоннекторHTTP HTTP client'
  },
  convert: (request) => convertConnector(request, 'ru')
};

export const connectorEn = {
  info: {
    key: 'connector-en',
    title: 'Connector (EN)',
    link: 'https://github.com/vbondarevsky/Connector',
    description: 'HTTPConnector HTTP client'
  },
  convert: (request) => convertConnector(request, 'en')
};
