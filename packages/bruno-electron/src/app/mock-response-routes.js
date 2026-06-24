const { listMockResponses } = require('./mock-response-store');

const extractRoutePath = (rawUrl) => {
  if (!rawUrl) {
    return null;
  }

  let cleaned = String(rawUrl).trim();
  cleaned = cleaned.replace(/^\{\{[^}]+\}\}/, '');

  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    try {
      cleaned = new URL(cleaned).pathname;
    } catch {
      const qIndex = cleaned.indexOf('?');
      if (qIndex !== -1) {
        cleaned = cleaned.substring(0, qIndex);
      }
    }
  } else {
    const ipHostMatch = cleaned.match(/^(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?(\/[^?#]*)?/);
    if (ipHostMatch) {
      cleaned = ipHostMatch[1] || '/';
    } else {
      const domainHostMatch = cleaned.match(/^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]+(?::\d+)?(\/[^?#]*)?/);
      if (domainHostMatch) {
        cleaned = domainHostMatch[1] || '/';
      }
    }

    const qIndex = cleaned.indexOf('?');
    if (qIndex !== -1) {
      cleaned = cleaned.substring(0, qIndex);
    }
  }

  cleaned = cleaned.replace(/\{\{([^}]+)\}\}/g, ':$1');

  if (!cleaned.startsWith('/')) {
    cleaned = `/${cleaned}`;
  }
  if (cleaned.length > 1 && cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  cleaned = cleaned.replace(/\/+/g, '/');

  return cleaned || '/';
};

const normalizeMockResponseEntry = (response) => ({
  status: Number(response?.status) || 200,
  statusText: response?.statusText || '',
  headers: (response?.headers || [])
    .filter((header) => header.enabled !== false && header.name)
    .map((header) => ({
      name: header.name,
      value: header.value
    })),
  body: {
    type: response?.body?.type || 'text',
    content: response?.body?.content || ''
  }
});

const buildRouteMapFromMockResponses = ({ mockServerUid, collectionPath, sourceType, workspacePath }) => {
  const routeMap = new Map();
  const responses = listMockResponses({ mockServerUid, collectionPath, sourceType, workspacePath });

  for (const mockResponse of responses) {
    const method = (mockResponse.request?.method || 'GET').toUpperCase();
    const routePath = extractRoutePath(mockResponse.request?.url);

    if (!routePath) {
      continue;
    }

    const routeKey = `${method} ${routePath}`;

    if (!routeMap.has(routeKey)) {
      routeMap.set(routeKey, []);
    }

    routeMap.get(routeKey).push({
      responseUid: mockResponse.uid,
      responseName: mockResponse.name || 'Mock Response',
      sourceFile: 'mock-response',
      rules: mockResponse.rules || { operator: 'AND', conditions: [] },
      response: normalizeMockResponseEntry(mockResponse.response)
    });
  }

  return routeMap;
};

const countRouteResponses = (routeMap) => {
  let count = 0;
  for (const responses of routeMap.values()) {
    count += responses.length;
  }
  return count;
};

const routeMapToRouteTable = (routeMap) => {
  const routes = [];

  for (const [routeKey, responses] of routeMap) {
    const [method, ...pathParts] = routeKey.split(' ');
    routes.push({
      method,
      path: pathParts.join(' '),
      responseCount: responses.length,
      responses: responses.map((entry) => ({
        uid: entry.responseUid,
        name: entry.responseName,
        status: entry.response.status,
        sourceFile: entry.sourceFile
      })),
      defaultResponse: responses[0]?.responseName || null
    });
  }

  return routes.sort((left, right) => (
    `${left.method} ${left.path}`.localeCompare(`${right.method} ${right.path}`)
  ));
};

module.exports = {
  buildRouteMapFromMockResponses,
  countRouteResponses,
  extractRoutePath,
  routeMapToRouteTable
};
