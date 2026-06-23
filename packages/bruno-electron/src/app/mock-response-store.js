const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const { v4: uuidv4 } = require('uuid');

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const getStorePath = ({ mockServerUid, collectionPath, sourceType }) => {
  if (!mockServerUid) {
    throw new Error('Mock server id is required.');
  }

  if (sourceType === 'collection' && collectionPath) {
    return path.join(collectionPath, '.bruno', 'mocks', `${mockServerUid}.json`);
  }

  return path.join(app.getPath('userData'), 'mock-responses', `${mockServerUid}.json`);
};

const readStore = (location) => {
  const filePath = getStorePath(location);

  if (!fs.existsSync(filePath)) {
    return { responses: [] };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return {
      responses: Array.isArray(parsed.responses) ? parsed.responses : []
    };
  } catch (err) {
    console.warn(`[MockResponseStore] Failed to read ${filePath}: ${err.message}`);
    return { responses: [] };
  }
};

const writeStore = (location, store) => {
  const filePath = getStorePath(location);
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(store, null, 2), 'utf8');
  return filePath;
};

const createEmptyMockResponse = (name = 'New Mock Response') => ({
  uid: uuidv4(),
  name,
  description: '',
  request: {
    url: '/',
    method: 'GET',
    headers: [],
    params: [],
    body: {
      mode: 'none'
    }
  },
  response: {
    status: 200,
    statusText: 'OK',
    headers: [],
    body: {
      type: 'json',
      content: '{\n  \n}'
    }
  },
  rules: {
    operator: 'AND',
    conditions: []
  }
});

const listMockResponses = (location) => readStore(location).responses;

const saveMockResponse = (location, response) => {
  const nextResponse = {
    ...response,
    uid: response?.uid || uuidv4()
  };

  const store = readStore(location);
  const index = store.responses.findIndex((item) => item.uid === nextResponse.uid);

  if (index >= 0) {
    store.responses[index] = nextResponse;
  } else {
    store.responses.push(nextResponse);
  }

  writeStore(location, store);
  return nextResponse;
};

const deleteMockResponse = (location, responseUid) => {
  const store = readStore(location);
  const nextResponses = store.responses.filter((item) => item.uid !== responseUid);

  if (nextResponses.length === store.responses.length) {
    throw new Error('Mock response not found.');
  }

  writeStore(location, { responses: nextResponses });
  return { responseUid };
};

module.exports = {
  createEmptyMockResponse,
  deleteMockResponse,
  getStorePath,
  listMockResponses,
  readStore,
  saveMockResponse
};
