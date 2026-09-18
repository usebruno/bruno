// Extracted verbatim from the timeline pushes in axios-instance.js, so rows written from outside the interceptors match.
const row = (timeline, type, message) => timeline.push({ timestamp: new Date(), type, message });

const separator = (timeline) => timeline.push({ timestamp: new Date(), type: 'separator' });

const info = (timeline, message) => row(timeline, 'info', message);

const requestLine = (timeline, { method, url }) => row(timeline, 'request', `${method.toUpperCase()} ${url}`);

const responseLine = (timeline, { httpVersion, status, statusText }) =>
  row(timeline, 'response', `HTTP/${httpVersion || '1.1'} ${status} ${statusText}`);

const dataRow = (timeline, data) =>
  row(timeline, 'requestData', typeof data === 'string' ? data : JSON.stringify(data, null, 2));

const headerRows = (timeline, type, headers) => {
  Object.entries(headers).forEach(([name, value]) => row(timeline, type, `${name}: ${value}`));
};

module.exports = { separator, info, requestLine, responseLine, dataRow, headerRows };
