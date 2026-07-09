import get from 'lodash/get';
import { uuid } from 'utils/common';
import { normalizePath } from 'utils/common/path';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import { addTab, closeTabs, updateTabMeta } from 'providers/ReduxStore/slices/tabs';
import {
  loadMockServerInstances,
  removeMockServerData,
  removeMockServerInstance,
  stopMockServer,
  upsertMockServerInstance
} from 'providers/ReduxStore/slices/mock-server';

export const DEFAULT_MOCK_SERVER_PORT = 4000;

export const normalizeMockTabType = (type) => {
  if (type === 'mock-server-dashboard' || type === 'mocker') {
    return 'mock-server';
  }

  return type;
};

export const isMockServerRelatedTab = (tab, mockServerUid) => {
  const type = normalizeMockTabType(tab?.type);
  return (type === 'mock-server' || type === 'mock-response') && tab?.mockServerUid === mockServerUid;
};

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

export const getMockServerInstances = (state, workspaceUid) => {
  if (!workspaceUid) {
    return Object.values(state.mockServer?.instancesByWorkspace || {}).flat();
  }

  return get(state.mockServer?.instancesByWorkspace, workspaceUid, []);
};

export const findMockServerInstance = (state, mockServerUid) => {
  const instancesByWorkspace = state.mockServer?.instancesByWorkspace || {};

  for (const instances of Object.values(instancesByWorkspace)) {
    const instance = instances.find((item) => item.uid === mockServerUid);
    if (instance) {
      return instance;
    }
  }

  return null;
};

export const resolveMockServerInstance = (state, { mockServerUid, collectionUid }) => {
  if (mockServerUid) {
    return findMockServerInstance(state, mockServerUid);
  }

  const instances = getMockServerInstances(state);
  return instances.find((instance) => (
    instance.sourceType === 'collection' && instance.collectionUid === collectionUid
  )) || null;
};

const clearLegacyMockServerPrefs = (preferences, workspaceUid) => ({
  ...preferences,
  mockServer: {
    ...preferences.mockServer,
    instances: get(preferences, 'mockServer.instances', []).filter((item) => item.workspaceUid !== workspaceUid)
  }
});

export const hydrateMockServerInstances = (workspacePath, workspaceUid) => async (dispatch, getState) => {
  if (!workspacePath || !workspaceUid) {
    return [];
  }

  const preferences = getState().app.preferences;
  const migrateFrom = get(preferences, 'mockServer.instances', [])
    .filter((instance) => instance.workspaceUid === workspaceUid);

  const result = await dispatch(loadMockServerInstances({
    workspacePath,
    workspaceUid,
    migrateFrom
  })).unwrap();

  if (migrateFrom.length) {
    await dispatch(savePreferences(clearLegacyMockServerPrefs(preferences, workspaceUid)));
  }

  return result.instances || [];
};

export const saveMockServerInstance = (instance) => async (dispatch, getState) => {
  const state = getState();
  const workspacePath = resolveMockServerWorkspacePath(
    instance,
    state.workspaces.workspaces,
    state.workspaces.workspaces.find((workspace) => workspace.uid === state.workspaces.activeWorkspaceUid) || null
  );

  if (!workspacePath) {
    throw new Error('Workspace path is required.');
  }

  const result = await window.ipcRenderer.invoke('renderer:mock-server-save-instance', {
    workspacePath,
    instance
  });

  if (!result?.success) {
    throw new Error(result?.error || 'Failed to save mock server');
  }

  const savedInstance = result.instance || instance;
  dispatch(upsertMockServerInstance({
    workspaceUid: instance.workspaceUid,
    instance: savedInstance
  }));

  return savedInstance;
};

export const deleteMockServerInstance = (mockServerUid) => async (dispatch, getState) => {
  const state = getState();
  const instance = findMockServerInstance(state, mockServerUid);
  const serverState = state.mockServer?.servers?.[mockServerUid];
  const isActive = serverState?.status === 'running' || serverState?.status === 'starting';

  if (isActive) {
    try {
      await dispatch(stopMockServer({ mockServerUid })).unwrap();
    } catch {
      // Continue deleting the configuration even if stop fails.
    }
  }

  const workspacePath = resolveMockServerWorkspacePath(
    instance,
    state.workspaces.workspaces,
    state.workspaces.workspaces.find((workspace) => workspace.uid === state.workspaces.activeWorkspaceUid) || null
  );

  if (workspacePath) {
    const result = await window.ipcRenderer.invoke('renderer:mock-server-delete', {
      mockServerUid,
      workspacePath
    });

    if (!result?.success) {
      throw new Error(result?.error || 'Failed to delete mock server data');
    }
  }

  const tabUids = (state.tabs?.tabs || [])
    .filter((tab) => isMockServerRelatedTab(tab, mockServerUid))
    .map((tab) => tab.uid);

  if (tabUids.length) {
    dispatch(closeTabs({ tabUids }));
  }

  if (instance?.workspaceUid) {
    dispatch(removeMockServerInstance({
      workspaceUid: instance.workspaceUid,
      mockServerUid
    }));
  }

  dispatch(removeMockServerData({ mockServerUid }));

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
  sourceType: sourceType || 'manual',
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

export const resolveMockServerWorkspacePath = (instance, workspaces = [], activeWorkspace = null) => {
  if (instance?.workspaceUid) {
    const workspace = workspaces.find((item) => item.uid === instance.workspaceUid);
    if (workspace?.pathname) {
      return workspace.pathname;
    }
  }

  return activeWorkspace?.pathname || null;
};

export const resolveMockServerStartPayload = (instance, { collection, apiSpecs, workspacePath }) => {
  const mockServerUid = instance.uid;
  const resolvedWorkspacePath = workspacePath || null;

  if (instance.sourceType === 'manual') {
    return {
      mockServerUid,
      serverName: instance.name,
      sourceType: 'manual',
      workspacePath: resolvedWorkspacePath,
      port: Number(instance.port),
      globalDelay: Number(instance.globalDelay) || 0
    };
  }

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
      workspacePath: resolvedWorkspacePath,
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
    workspacePath: resolvedWorkspacePath,
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
    type: 'mock-server'
  }));
};

export const updateMockServerTabName = (instance) => (dispatch) => {
  dispatch(updateTabMeta({
    uid: instance.uid,
    tabName: instance.name
  }));
};

export const isMockServerNameTaken = (instances, name, excludeUid = null) => {
  const normalized = name?.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return instances.some((instance) => (
    instance.uid !== excludeUid && instance.name.trim().toLowerCase() === normalized
  ));
};

export const isMockServerPortTaken = (instances, port, excludeUid = null) => {
  const normalizedPort = Number(port);
  if (!normalizedPort) {
    return false;
  }

  return instances.some((instance) => (
    instance.uid !== excludeUid && Number(instance.port) === normalizedPort
  ));
};

export const getConfiguredMockServerPorts = (instances, { excludeUid } = {}) => (
  instances
    .filter((instance) => instance.uid !== excludeUid)
    .map((instance) => Number(instance.port))
    .filter((port) => port >= 1 && port <= 65535)
);

export const checkMockServerPortAvailable = async (port, instances, { excludeUid } = {}) => {
  const result = await window.ipcRenderer.invoke('renderer:mock-server-check-port', {
    port: Number(port),
    mockServerUid: excludeUid || null,
    additionalUsedPorts: getConfiguredMockServerPorts(instances, { excludeUid })
  });

  if (!result?.success) {
    throw new Error(result?.error || 'Failed to check port availability');
  }

  return result;
};

export const getMockServerPortError = (portCheck, port) => {
  if (!portCheck || portCheck.available) {
    return null;
  }

  const normalizedPort = Number(port);

  if (portCheck.reason === 'system') {
    return `Port ${normalizedPort} is already in use on this system.`;
  }

  if (portCheck.reason === 'bruno' || portCheck.reason === 'bruno-config') {
    return `Port ${normalizedPort} is already used by another mock server in Bruno.`;
  }

  return 'Port must be between 1 and 65535.';
};

export const suggestAvailableMockServerPort = async (instances, { excludeUid, startPort } = {}) => {
  const localPort = suggestNextMockServerPort(instances, { excludeUid });
  const result = await window.ipcRenderer.invoke('renderer:mock-server-suggest-port', {
    startPort: startPort || localPort,
    additionalUsedPorts: getConfiguredMockServerPorts(instances, { excludeUid })
  });

  if (result?.success && result.port) {
    return result.port;
  }

  return localPort;
};

export const cloneMockServerInstancePayload = (sourceInstance, { name, port, workspaceUid }) => (
  createMockServerInstance({
    name,
    sourceType: sourceInstance.sourceType,
    collectionUid: sourceInstance.collectionUid,
    specUid: sourceInstance.specUid,
    specPath: sourceInstance.specPath,
    specName: sourceInstance.specName,
    port,
    globalDelay: sourceInstance.globalDelay,
    workspaceUid: workspaceUid || sourceInstance.workspaceUid
  })
);
