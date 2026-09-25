const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const mergeObjectFields = (acc, obj) => {
  if (!isPlainObject(obj)) {
    return;
  }

  if (typeof obj.collectionPathname === 'string' && obj.collectionPathname) {
    acc.collectionPathname = obj.collectionPathname;
  }

  if (typeof obj.collectionPath === 'string' && obj.collectionPath) {
    acc.collectionPathname = obj.collectionPath;
  }

  if (typeof obj.collectionUid === 'string' && obj.collectionUid) {
    acc.collectionUid = obj.collectionUid;
  }

  if (typeof obj.itemUid === 'string' && obj.itemUid) {
    acc.itemUid = obj.itemUid;
  }

  if (typeof obj.requestUid === 'string' && obj.requestUid) {
    acc.requestUid = obj.requestUid;
  }

  if (typeof obj.requestId === 'string' && obj.requestId) {
    acc.requestId = obj.requestId;
  }

  if (isPlainObject(obj.collection)) {
    mergeCollectionNested(acc, obj.collection);
  }

  if (isPlainObject(obj.request)) {
    mergeRequestNested(acc, obj.request);
  }
};

const mergeCollectionNested = (acc, collection) => {
  if (typeof collection.pathname === 'string' && collection.pathname) {
    acc.collectionPathname = collection.pathname;
  }

  if (typeof collection.uid === 'string' && collection.uid) {
    acc.collectionUid = collection.uid;
  }
};

const mergeRequestNested = (acc, request) => {
  if (typeof request.uid === 'string' && request.uid) {
    acc.itemUid = request.uid;
  }

  if (typeof request.itemUid === 'string' && request.itemUid) {
    acc.itemUid = request.itemUid;
  }

  if (typeof request.requestUid === 'string' && request.requestUid) {
    acc.requestUid = request.requestUid;
  }

  if (typeof request.requestId === 'string' && request.requestId) {
    acc.requestId = request.requestId;
  }
};

const extractBenchmarkContext = (args) => {
  const acc = {};

  for (const arg of args) {
    mergeObjectFields(acc, arg);
  }

  const meta = {};

  if (acc.collectionPathname) {
    meta.collectionPathname = acc.collectionPathname;
  } else if (acc.collectionUid) {
    meta.collectionUid = acc.collectionUid;
  }

  if (acc.itemUid) {
    meta.itemUid = acc.itemUid;
  }

  if (acc.requestUid) {
    meta.requestUid = acc.requestUid;
  }

  if (acc.requestId) {
    meta.requestId = acc.requestId;
  }

  return meta;
};

module.exports = { extractBenchmarkContext };
