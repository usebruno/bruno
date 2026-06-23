import get from 'lodash/get';
import { uuid } from 'utils/common';
import { normalizePath } from 'utils/common/path';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import { addTab, closeTabs } from 'providers/ReduxStore/slices/tabs';
import { stopMockServer } from 'providers/ReduxStore/slices/mock-server';

export const DEFAULT_MOCK_SERVER_PORT = 4000;

export const suggestNextMockServerPort = (instances, { excludeUid } = {}) => {
  const usedPorts = new Set(
    instances
      .filter((instance) => instance.uid !== excludeUid)
      .map((instance) => Number(instance.port))
      .filter((port) => port >= 1 && port <= 65535)
  );

  let port = DEFAULT_MOCK_SERVER_PORT;
  while (usedPorts.has(port)) {
    port += 1;
    if (port > 65535) {
      return DEFAULT_MOCK_SERVER_PORT;
    }
  }

  return port;
};

export const getMockServerInstances = (preferences, workspaceUid) => {
  const instances = get(preferences, 'mockServer.instances', []);
  if (!workspaceUid) {
    return instances;
  }

  return instances.filter((instance) => instance.workspaceUid === workspaceUid);
};

export const findMockServerInstance = (preferences, mockServerUid) => {
  const instances = get(preferences, 'mockServer.instances', []);
  return instances.find((instance) => instance.uid === mockServerUid) || null;
};

export const resolveMockServerInstance = (preferences, { mockServerUid, collectionUid }) => {
  if (mockServerUid) {
    return findMockServerInstance(preferences, mockServerUid);
  }

  const instances = get(preferences, 'mockServer.instances', []);
  return instances.find((instance) => (
    instance.sourceType === 'collection' && instance.collectionUid === collectionUid
  )) || null;
};

export const saveMockServerInstance = (instance) => (dispatch, getState) => {
  const preferences = getState().app.preferences;
  const instances = [...get(preferences, 'mockServer.instances', [])];
  const existingIndex = instances.findIndex((item) => item.uid === instance.uid);

  if (existingIndex >= 0) {
    instances[existingIndex] = instance;
  } else {
    instances.push(instance);
  }

  return dispatch(savePreferences({
    ...preferences,
    mockServer: {
      ...preferences.mockServer,
      instances
    }
  }));
};

export const deleteMockServerInstance = (mockServerUid) => async (dispatch, getState) => {
  const state = getState();
  const serverState = state.mockServer?.servers?.[mockServerUid];
  const isActive = serverState?.status === 'running' || serverState?.status === 'starting';

  if (isActive) {
    try {
      await dispatch(stopMockServer({ mockServerUid })).unwrap();
    } catch {
      // Continue deleting the configuration even if stop fails.
    }
  }

  const tabUids = (state.tabs?.tabs || [])
    .filter((tab) => tab.type === 'mocker' && tab.mockServerUid === mockServerUid)
    .map((tab) => tab.uid);

  if (tabUids.length) {
    dispatch(closeTabs({ tabUids }));
  }

  const preferences = state.app.preferences;
  const instances = get(preferences, 'mockServer.instances', []).filter((instance) => instance.uid !== mockServerUid);

  await dispatch(savePreferences({
    ...preferences,
    mockServer: {
      ...preferences.mockServer,
      instances
    }
  }));

  return { mockServerUid };
};

export const createMockServerInstance = ({
  name,
  sourceType,
  collectionUid,
  specUid,
  specPath,
  specName,
  port,
  globalDelay,
  workspaceUid
}) => ({
  uid: uuid(),
  name: name.trim(),
  sourceType,
  collectionUid: sourceType === 'collection' ? collectionUid : null,
  specUid: sourceType === 'spec' ? specUid : null,
  specPath: sourceType === 'spec' ? specPath || null : null,
  specName: sourceType === 'spec' ? specName || null : null,
  port: Number(port) || DEFAULT_MOCK_SERVER_PORT,
  globalDelay: Number(globalDelay) || 0,
  workspaceUid
});

export const resolveInstanceSpec = (instance, apiSpecs) => {
  if (!instance || instance.sourceType !== 'spec') {
    return null;
  }

  const byUid = apiSpecs.find((spec) => spec.uid === instance.specUid);
  if (byUid) {
    return byUid;
  }

  if (instance.specPath) {
    const byPath = apiSpecs.find(
      (spec) => normalizePath(spec.pathname) === normalizePath(instance.specPath)
    );
    if (byPath) {
      return byPath;
    }

    return {
      uid: instance.specUid,
      pathname: instance.specPath,
      name: instance.specName,
      filename: instance.specName
    };
  }

  return null;
};

export const resolveTabCollectionUid = ({
  sourceType,
  collectionUid,
  activeWorkspace,
  workspaceCollections = []
}) => {
  if (sourceType === 'collection' && collectionUid) {
    return collectionUid;
  }

  if (activeWorkspace?.scratchCollectionUid) {
    return activeWorkspace.scratchCollectionUid;
  }

  const firstCollection = workspaceCollections.find((collection) => collection.uid);
  if (firstCollection?.uid) {
    return firstCollection.uid;
  }

  return collectionUid || null;
};

export const resolveMockServerStartPayload = (instance, { collection, apiSpecs }) => {
  const mockServerUid = instance.uid;

  if (instance.sourceType === 'spec') {
    const spec = resolveInstanceSpec(instance, apiSpecs);
    if (!spec?.pathname) {
      throw new Error('Selected API spec is not available. Open it in the workspace first.');
    }

    return {
      mockServerUid,
      serverName: instance.name,
      sourceType: 'spec',
      specPath: spec.pathname,
      port: Number(instance.port),
      globalDelay: Number(instance.globalDelay) || 0
    };
  }

  if (!collection?.pathname) {
    throw new Error('Selected collection is not available.');
  }

  return {
    mockServerUid,
    serverName: instance.name,
    sourceType: 'collection',
    collectionPath: collection.pathname,
    collectionName: collection.name,
    brunoConfig: collection.brunoConfig,
    port: Number(instance.port),
    globalDelay: Number(instance.globalDelay) || 0
  };
};

export const openMockServerDashboard = (instance, collectionUid) => (dispatch) => {
  dispatch(addTab({
    uid: instance.uid,
    collectionUid: collectionUid || instance.collectionUid,
    mockServerUid: instance.uid,
    tabName: instance.name,
    type: 'mocker'
  }));
};
