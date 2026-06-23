export const resolveMockResponseLocation = (instance, collection) => ({
  mockServerUid: instance.uid,
  sourceType: instance.sourceType,
  collectionPath: instance.sourceType === 'collection' ? collection?.pathname || null : null
});

export const copyExampleToMockResponse = (example, parentRequest) => ({
  name: `${example.name || 'Example'} (mock)`,
  description: example.description || '',
  copiedFrom: {
    exampleName: example.name || null,
    requestPathname: parentRequest?.pathname || null
  },
  request: {
    url: example.request?.url || parentRequest?.request?.url || '/',
    method: (example.request?.method || parentRequest?.request?.method || 'GET').toUpperCase(),
    headers: example.request?.headers || [],
    params: example.request?.params || [],
    body: example.request?.body || { mode: 'none' }
  },
  response: {
    status: Number(example.response?.status) || 200,
    statusText: example.response?.statusText || 'OK',
    headers: example.response?.headers || [],
    body: {
      type: example.response?.body?.type || 'json',
      content: example.response?.body?.content || ''
    }
  },
  rules: {
    operator: 'AND',
    conditions: []
  }
});

export const collectCollectionExamples = (collection) => {
  const examples = [];

  const walk = (items = []) => {
    for (const item of items) {
      if (item.type === 'http-request' && item.examples?.length) {
        for (const example of item.examples) {
          examples.push({
            item,
            example
          });
        }
      }

      if (item.items?.length) {
        walk(item.items);
      }
    }
  };

  walk(collection?.items || []);
  return examples;
};
