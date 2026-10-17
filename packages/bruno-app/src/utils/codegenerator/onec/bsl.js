import { platform } from './keywords';

const LINE_BREAK = /\r\n|\r|\n/;

export const isMultiline = (value) => {
  return LINE_BREAK.test(String(value));
};

export const quote = (value = '') => {
  const escaped = String(value).replace(/"/g, '""');
  const lines = escaped.split(LINE_BREAK);

  if (lines.length === 1) {
    return `"${escaped}"`;
  }

  return `"${lines[0]}\n${lines.slice(1).map((line) => `|${line}`).join('\n')}"`;
};

export const literal = (value, lang) => {
  const kw = platform[lang];

  if (value === null || value === undefined) {
    return kw.Undefined;
  }

  if (typeof value === 'boolean') {
    return value ? kw.True : kw.False;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return quote(value);
};

export const isJsonMime = (mimeType = '') => {
  return /json/i.test(mimeType);
};

export const jsonBodyText = (postData = {}) => {
  if (postData.text !== undefined && postData.text !== null && String(postData.text).length) {
    return String(postData.text);
  }

  if (postData.jsonObj !== undefined) {
    return JSON.stringify(postData.jsonObj);
  }

  return undefined;
};

export const prettyJsonBodyText = (postData = {}) => {
  const text = jsonBodyText(postData);
  if (text === undefined) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(text);
    if (parsed !== null && typeof parsed === 'object') {
      return JSON.stringify(parsed, null, '\t');
    }
  } catch {
    return text;
  }

  return text;
};

export const stringBodyVariable = {
  ru: 'ДанныеСтрокой',
  en: 'DataAsString'
};

export const assignStringBody = (text, lang) => {
  return multilineStringAssign(stringBodyVariable[lang], text);
};

export const isFormUrlEncoded = (mimeType = '') => {
  return /x-www-form-urlencoded/i.test(mimeType);
};

export const isMultipart = (mimeType = '') => {
  return /multipart\/form-data/i.test(mimeType);
};

export const fileNameFromPath = (filePath = '') => {
  const segments = String(filePath).split(/[/\\]/).filter(Boolean);
  return segments.length ? segments[segments.length - 1] : String(filePath);
};

export const multipartVariableNames = {
  ru: {
    boundary: 'Разделитель',
    bodyStream: 'Тело',
    dataWriter: 'ЗаписьДанных',
    bodyData: 'ДанныеТела',
    filePath: 'ПолноеИмяФайла',
    fileData: 'ДвоичныеДанныеФайла'
  },
  en: {
    boundary: 'Boundary',
    bodyStream: 'Body',
    dataWriter: 'DataWriter',
    bodyData: 'BodyData',
    filePath: 'FilePath',
    fileData: 'FileBinaryData'
  }
};

export const contentTypeMultipartExpression = (boundaryVariable) => {
  return `"multipart/form-data; boundary=" + ${boundaryVariable}`;
};

export const withoutContentType = (headerEntries = []) => {
  return headerEntries.filter(([name]) => String(name).toLowerCase() !== 'content-type');
};

export const multipartParams = (postData = {}) => {
  if (Array.isArray(postData.params)) {
    return postData.params.filter((param) => param && param.name !== undefined);
  }

  if (postData.paramsObj && typeof postData.paramsObj === 'object') {
    return Object.entries(postData.paramsObj).map(([name, value]) => {
      if (value && typeof value === 'object') {
        return { name, ...value };
      }

      return { name, value };
    });
  }

  return [];
};

export const fileBodyParam = (postData = {}) => {
  if (isMultipart(postData.mimeType)) {
    return null;
  }

  const params = Array.isArray(postData.params) ? postData.params : [];
  const fileParam = params.find((param) => param && param.fileName);
  if (!fileParam) {
    return null;
  }

  return {
    path: fileParam.fileName || fileParam.value || postData.text || '',
    contentType: fileParam.contentType || postData.mimeType || 'application/octet-stream'
  };
};

export const collectClientFilePaths = (postData = {}) => {
  const fileBody = fileBodyParam(postData);
  if (fileBody?.path) {
    return [fileBody.path];
  }

  if (!isMultipart(postData.mimeType)) {
    return [];
  }

  return multipartParams(postData)
    .filter((param) => param.fileName)
    .map((param) => param.fileName);
};

export const describeClientFiles = (paths, lang) => {
  const uniquePaths = [...new Set((paths || []).filter(Boolean))];
  const names = multipartVariableNames[lang];
  const addressName = lang === 'ru' ? 'АдресФайла' : 'FileAddress';

  return uniquePaths.map((path, index) => {
    const suffix = uniquePaths.length > 1 ? String(index + 1) : '';
    return {
      path,
      pathVar: `${names.filePath}${suffix}`,
      addressVar: `${addressName}${suffix}`,
      dataVar: `${names.fileData}${suffix}`
    };
  });
};

export const wrapWithClientFileTransfer = (serverLines, files, lang) => {
  if (!files.length) {
    return joinLines(serverLines);
  }

  const kw = platform[lang];
  const executeRequest = lang === 'ru' ? 'ВыполнитьЗапрос' : 'ExecuteRequest';
  const executeRequestOnServer = lang === 'ru' ? 'ВыполнитьЗапросНаСервере' : 'ExecuteRequestOnServer';
  const header = lang === 'ru'
    ? '// Вставить в модуль формы. Файл читается на клиенте и передается на сервер.'
    : '// Paste into a form module. The file is read on the client and sent to the server.';

  const lines = [
    header,
    '',
    kw.AtClient,
    `${kw.Procedure} ${executeRequest}()`,
    ''
  ];

  files.forEach((file) => {
    lines.push(`\t${file.pathVar} = ${quote(file.path)};`);
    lines.push(`\t${file.addressVar} = "";`);
    lines.push(`\t${kw.PutFile}(${file.addressVar}, ${file.pathVar}, , ${kw.False}, ${kw.FormUUID});`);
    lines.push('');
  });

  lines.push(`\t${executeRequestOnServer}(${files.map((file) => file.addressVar).join(', ')});`);
  lines.push('');
  lines.push(kw.EndProcedure);
  lines.push('');
  lines.push(kw.AtServer);
  lines.push(`${kw.Procedure} ${executeRequestOnServer}(${files.map((file) => file.addressVar).join(', ')})`);
  lines.push('');

  files.forEach((file) => {
    lines.push(`\t${file.dataVar} = ${kw.GetFromTempStorage}(${file.addressVar});`);
  });
  lines.push('');

  serverLines.forEach((line) => {
    lines.push(line ? `\t${line}` : '');
  });

  lines.push('');
  lines.push(kw.EndProcedure);

  return joinLines(lines);
};

export const appendMultipartBody = (lines, params, lang, uploadedFiles = []) => {
  const kw = platform[lang];
  const names = multipartVariableNames[lang];

  lines.push(
    `${names.boundary} = ${kw.StrReplace}(${kw.String}(${kw.New} ${kw.UUID}), "-", "");`,
    '',
    `${names.bodyStream} = ${kw.New} ${kw.MemoryStream};`,
    `${names.dataWriter} = ${kw.New} ${kw.DataWriter}(${names.bodyStream}, , , ${kw.CharsCR} + ${kw.CharsLF}, "");`
  );

  const hasMultipleFiles = params.filter((item) => item.fileName).length > 1;

  params.forEach((param, index) => {
    const fileName = param.fileName;
    const partContentType = param.contentType || (fileName ? 'application/octet-stream' : '');
    const disposition = fileName
      ? `Content-Disposition: form-data; name="${param.name}"; filename="${fileNameFromPath(fileName)}"`
      : `Content-Disposition: form-data; name="${param.name}"`;

    lines.push(`${names.dataWriter}.${kw.WriteLine}("--" + ${names.boundary});`);
    lines.push(`${names.dataWriter}.${kw.WriteLine}(${quote(disposition)});`);

    if (partContentType) {
      lines.push(`${names.dataWriter}.${kw.WriteLine}(${quote(`Content-Type: ${partContentType}`)});`);
    }

    lines.push(`${names.dataWriter}.${kw.WriteLine}("");`);

    if (fileName) {
      const uploaded = uploadedFiles.find((file) => file.path === fileName);
      if (uploaded) {
        lines.push(`${names.dataWriter}.${kw.Write}(${uploaded.dataVar});`);
      } else {
        const pathName = hasMultipleFiles
          ? `${names.filePath}${index + 1}`
          : names.filePath;
        const dataName = hasMultipleFiles
          ? `${names.fileData}${index + 1}`
          : names.fileData;
        lines.push(`${pathName} = ${quote(fileName)};`);
        lines.push(`${dataName} = ${kw.New} ${kw.BinaryData}(${pathName});`);
        lines.push(`${names.dataWriter}.${kw.Write}(${dataName});`);
      }
      lines.push(`${names.dataWriter}.${kw.WriteLine}("");`);
    } else {
      lines.push(`${names.dataWriter}.${kw.WriteLine}(${quote(param.value ?? '')});`);
    }
  });

  lines.push(
    `${names.dataWriter}.${kw.WriteLine}("--" + ${names.boundary} + "--");`,
    `${names.dataWriter}.${kw.Close}();`,
    `${names.bodyData} = ${names.bodyStream}.${kw.CloseAndGetBinaryData}();`
  );

  return names;
};

export const objectEntries = (value) => {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? Object.entries(value)
    : [];
};

export const namedEntries = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && item.name !== undefined)
    .map((item) => [item.name, item.value]);
};

export const toEntries = (value = {}) => {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item && item.name !== undefined)
      .map((item) => [item.name, item.value ?? '']);
  }

  return objectEntries(value);
};

export const formFieldEntries = (postData = {}) => {
  const fromParams = namedEntries(postData.params);
  if (fromParams.length) {
    return fromParams;
  }

  return objectEntries(postData.paramsObj);
};

export const hasDuplicateKeys = (entries = []) => {
  const seen = new Set();

  for (const [key] of entries) {
    if (seen.has(key)) {
      return true;
    }

    seen.add(key);
  }

  return false;
};

export const formUrlEncodedText = (postData = {}) => {
  if (postData.text !== undefined && postData.text !== null && String(postData.text).length) {
    return String(postData.text);
  }

  const entries = formFieldEntries(postData);
  if (!entries.length) {
    return undefined;
  }

  return entries
    .map(([name, value]) => `${encodeURIComponent(String(name ?? ''))}=${encodeURIComponent(String(value ?? ''))}`)
    .join('&');
};

export const withoutQueryString = (fullUrl = '') => {
  const queryStart = fullUrl.indexOf('?');
  if (queryStart === -1) {
    return fullUrl;
  }

  const fragmentStart = fullUrl.indexOf('#', queryStart);
  return fragmentStart === -1
    ? fullUrl.slice(0, queryStart)
    : `${fullUrl.slice(0, queryStart)}${fullUrl.slice(fragmentStart)}`;
};

export const getHeader = (headers = {}, name) => {
  const target = String(name).toLowerCase();
  const key = Object.keys(headers).find((header) => header.toLowerCase() === target);
  return key ? { name: key, value: headers[key] } : null;
};

export const parseRequestUrl = (fullUrl = '') => {
  try {
    const parsed = new URL(fullUrl);
    const isHttps = parsed.protocol === 'https:';
    const port = parsed.port ? Number(parsed.port) : isHttps ? 443 : 80;
    const path = `${parsed.pathname || '/'}${parsed.search || ''}`;

    return {
      href: fullUrl,
      host: parsed.hostname,
      port,
      path,
      pathname: parsed.pathname || '/',
      search: parsed.search || '',
      isHttps
    };
  } catch (error) {
    return {
      href: fullUrl,
      host: fullUrl,
      port: 80,
      path: '/',
      pathname: '/',
      search: '',
      isHttps: false
    };
  }
};

const pushMapEntries = (lines, variableName, entries, lang) => {
  const kw = platform[lang];
  (entries || []).forEach(([key, value]) => {
    lines.push(`${variableName}.${kw.Insert}(${quote(key)}, ${literal(value, lang)});`);
  });
};

export const declareMap = (variableName, entries, lang) => {
  const kw = platform[lang];
  const lines = [`${variableName} = ${kw.New} ${kw.Map};`];
  pushMapEntries(lines, variableName, entries, lang);
  return lines;
};

export const declareStructure = (variableName, entries, lang) => {
  const kw = platform[lang];
  const lines = [`${variableName} = ${kw.New} ${kw.Structure};`];
  pushMapEntries(lines, variableName, entries, lang);
  return lines;
};

export const responseOutputLines = ({ lang, statusExpression, textExpression }) => {
  const kw = platform[lang];
  const textVariable = lang === 'ru' ? 'ТекстОтвета' : 'ResponseText';

  return [
    `${kw.Message}(${statusExpression});`,
    `${textVariable} = ${textExpression};`,
    `${kw.Message}(${textVariable});`
  ];
};

export const multilineStringAssign = (variableName, text = '') => {
  return [`${variableName} = ${quote(text)};`];
};

export const joinLines = (lines) => {
  return lines.filter((line) => line !== undefined).join('\n');
};
