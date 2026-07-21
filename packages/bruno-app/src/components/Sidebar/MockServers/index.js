import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import classnames from 'classnames';
import { IconChevronRight, IconCopy, IconDots, IconPencil, IconPlayerPlay, IconPlayerStop, IconSettings, IconTrash } from '@tabler/icons';
import toast from 'react-hot-toast';
import get from 'lodash/get';
import { mountCollection } from 'providers/ReduxStore/slices/collections/actions';
import { startMockServer, stopMockServer, loadAllMockResponses } from 'providers/ReduxStore/slices/mock-server';
import { normalizePath } from 'utils/common/path';
import {
  getMockServerInstances,
  hydrateMockServerInstances,
  openMockServerDashboard,
  checkMockServerPortAvailable,
  getMockServerPortError,
  resolveMockServerStartPayload,
  resolveMockServerWorkspacePath,
  resolveTabCollectionUid
} from 'utils/mock-server-instances';
import { resolveMockResponseLocation } from 'utils/mock-responses';
import CreateMockServerModal from 'components/MockServer/CreateMockServerModal';
import CloneMockServerModal from 'components/MockServer/CloneMockServerModal';
import RenameMockServerModal from 'components/MockServer/RenameMockServerModal';
import DeleteMockServerModal from 'components/MockServer/DeleteMockServerModal';
import MockResponseSidebarItem from './MockResponseSidebarItem';
import MenuDropdown from 'ui/MenuDropdown';
import ActionIcon from 'ui/ActionIcon';
import StyledWrapper from '../ApiSpecs/StyledWrapper';

const EMPTY_RESPONSES = [];

const StatusDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 8px;
  flex-shrink: 0;
  background: ${(props) => (props.$running ? '#22c55e' : '#9ca3af')};
`;

const MockServerItem = React.memo(({
  instance,
  collection,
  workspaceCollections,
  activeWorkspace,
  apiSpecs,
  preferences,
  workspaces,
  location,
  onEditSettings,
  onRename,
  onClone,
  onDelete
}) => {
  const dispatch = useDispatch();
  const workspaceInstances = useSelector((state) => getMockServerInstances(state, instance.workspaceUid));
  const serverState = useSelector((state) => state.mockServer.servers[instance.uid]);
  const responses = useSelector((state) => state.mockServer.mockResponses[instance.uid] || EMPTY_RESPONSES);
  const [expanded, setExpanded] = useState(false);
  const isRunning = serverState?.status === 'running';
  const isStarting = serverState?.status === 'starting';
  const isStopping = serverState?.status === 'stopping';

  const ensureCollectionMounted = () => {
    if (instance.sourceType !== 'collection' || !collection || collection.mountStatus === 'mounted') {
      return;
    }

    dispatch(mountCollection({
      collectionUid: collection.uid,
      collectionPathname: collection.pathname,
      brunoConfig: collection.brunoConfig
    }));
  };

  const openDashboard = () => {
    ensureCollectionMounted();

    const tabCollectionUid = resolveTabCollectionUid({
      sourceType: instance.sourceType,
      collectionUid: instance.collectionUid,
      activeWorkspace,
      workspaceCollections
    });

    dispatch(openMockServerDashboard(instance, tabCollectionUid));
  };

  const handleStart = async () => {
    try {
      if (instance.sourceType === 'collection') {
        ensureCollectionMounted();
      }

      const mockMode = get(preferences, 'mockServer.mode', 'isolated');
      if (mockMode !== 'shared') {
        const portCheck = await checkMockServerPortAvailable(instance.port, workspaceInstances, {
          excludeUid: instance.uid
        });
        const portError = getMockServerPortError(portCheck, instance.port);
        if (portError) {
          toast.error(portError);
          return;
        }
      }

      const payload = resolveMockServerStartPayload(instance, {
        collection,
        apiSpecs,
        workspacePath: resolveMockServerWorkspacePath(instance, workspaces, activeWorkspace)
      });
      const result = await dispatch(startMockServer(payload)).unwrap();

      const message = result.examplesGenerated
        ? `Mock server started at ${result.baseUrl}. Generated ${result.examplesGenerated} example(s).`
        : `Mock server started at ${result.baseUrl}`;
      toast.success(message);
    } catch (err) {
      toast.error(err.message || 'Failed to start mock server');
    }
  };

  const handleStop = async () => {
    try {
      await dispatch(stopMockServer({ mockServerUid: instance.uid })).unwrap();
      toast.success('Mock server stopped');
    } catch (err) {
      toast.error(err.message || 'Failed to stop mock server');
    }
  };

  const menuItems = [
    isRunning || isStopping
      ? {
          id: 'stop',
          leftSection: IconPlayerStop,
          label: isStopping ? 'Stopping...' : 'Stop Server',
          disabled: isStopping,
          testId: `mock-server-sidebar-stop-${instance.uid}`,
          onClick: handleStop
        }
      : {
          id: 'start',
          leftSection: IconPlayerPlay,
          label: isStarting ? 'Starting...' : 'Start Server',
          disabled: isStarting,
          testId: `mock-server-sidebar-start-${instance.uid}`,
          onClick: handleStart
        },
    {
      id: 'rename',
      leftSection: IconPencil,
      label: 'Rename',
      testId: `mock-server-sidebar-rename-${instance.uid}`,
      onClick: () => onRename(instance)
    },
    {
      id: 'clone',
      leftSection: IconCopy,
      label: 'Clone',
      testId: `mock-server-sidebar-clone-${instance.uid}`,
      onClick: () => onClone(instance)
    },
    {
      id: 'settings',
      leftSection: IconSettings,
      label: 'Settings',
      onClick: () => onEditSettings(instance)
    },
    {
      id: 'delete',
      leftSection: IconTrash,
      label: 'Delete',
      className: 'delete-item',
      onClick: () => onDelete(instance)
    }
  ];

  return (
    <>
      <div
        className="api-spec-item flex flex-grow items-center overflow-hidden w-full justify-between cursor-pointer py-2 pl-4 h-8"
        data-testid={`mock-server-sidebar-item-${instance.uid}`}
      >
        <span className="flex items-center flex-1 min-w-0">
          {responses.length > 0 ? (
            <button
              type="button"
              className={classnames('mr-1 flex-shrink-0', { 'rotate-90': expanded })}
              onClick={(event) => {
                event.stopPropagation();
                setExpanded(!expanded);
              }}
              aria-label="Toggle mock responses"
            >
              <IconChevronRight size={14} />
            </button>
          ) : (
            <span className="w-[18px] mr-1 flex-shrink-0" />
          )}
          <span
            className="flex items-center flex-nowrap whitespace-nowrap overflow-ellipsis overflow-hidden flex-1 min-w-0"
            onClick={openDashboard}
          >
            <StatusDot $running={isRunning} data-testid="mock-server-sidebar-status-dot" />
            <span className="truncate">{instance.name}</span>
            {responses.length > 0 ? (
              <sup className="ml-1 opacity-70">{responses.length}</sup>
            ) : null}
          </span>
        </span>
        <MenuDropdown items={menuItems} placement="bottom-end">
          <ActionIcon label="Mock server actions" className="mr-2">
            <IconDots size={14} stroke={1.5} aria-hidden="true" />
          </ActionIcon>
        </MenuDropdown>
      </div>

      {expanded && responses.length > 0 ? (
        <div className="pl-8">
          {responses.map((response) => (
            <MockResponseSidebarItem
              key={response.uid}
              response={response}
              instance={instance}
              collectionUid={collection?.uid || instance.collectionUid}
              location={location}
            />
          ))}
        </div>
      ) : null}
    </>
  );
});

MockServerItem.displayName = 'MockServerItem';

const MockServers = () => {
  const dispatch = useDispatch();
  const [editingInstance, setEditingInstance] = useState(null);
  const [renamingInstance, setRenamingInstance] = useState(null);
  const [cloningInstance, setCloningInstance] = useState(null);
  const [deletingInstance, setDeletingInstance] = useState(null);
  const loadedLocationsKeyRef = useRef('');
  const collections = useSelector((state) => state.collections.collections);
  const activeWorkspaceUid = useSelector((state) => state.workspaces.activeWorkspaceUid);
  const workspaces = useSelector((state) => state.workspaces.workspaces);
  const apiSpecs = useSelector((state) => state.apiSpec.apiSpecs);
  const preferences = useSelector((state) => state.app.preferences);

  const activeWorkspace = workspaces.find((workspace) => workspace.uid === activeWorkspaceUid);

  useEffect(() => {
    if (!activeWorkspace?.pathname || !activeWorkspaceUid) {
      return;
    }

    dispatch(hydrateMockServerInstances(activeWorkspace.pathname, activeWorkspaceUid));
  }, [dispatch, activeWorkspace?.pathname, activeWorkspaceUid]);

  const instances = useSelector((state) => getMockServerInstances(state, activeWorkspaceUid));
  const workspaceCollections = useMemo(() => {
    if (!activeWorkspace) {
      return [];
    }

    return collections.filter((collection) => (
      activeWorkspace.collections?.some(
        (workspaceCollection) => normalizePath(workspaceCollection.path) === normalizePath(collection.pathname)
      )
    ));
  }, [activeWorkspace, collections]);

  const instanceLocations = useMemo(() => (
    instances.map((instance) => {
      const collection = instance.sourceType === 'collection'
        ? collections.find((item) => item.uid === instance.collectionUid)
        : null;

      return {
        instance,
        collection,
        location: resolveMockResponseLocation(instance, collection, collections, workspaces, activeWorkspace)
      };
    })
  ), [instances, collections, workspaces, activeWorkspace]);

  useEffect(() => {
    if (!instanceLocations.length) {
      return;
    }

    const locationsKey = instanceLocations
      .map(({ location }) => `${location.mockServerUid}:${location.collectionPath || ''}:${location.workspacePath || ''}`)
      .join('|');

    if (locationsKey === loadedLocationsKeyRef.current) {
      return;
    }

    loadedLocationsKeyRef.current = locationsKey;
    dispatch(loadAllMockResponses({
      locations: instanceLocations.map(({ location }) => location)
    }));
  }, [dispatch, instanceLocations]);

  if (!instances.length) {
    return (
      <StyledWrapper>
        <div className="text-xs text-center placeholder py-4">
          <div>No mock servers yet.</div>
          <div className="mt-2">Use the + button to create one.</div>
        </div>
      </StyledWrapper>
    );
  }

  return (
    <>
      {renamingInstance && (
        <RenameMockServerModal
          instance={renamingInstance}
          onClose={() => setRenamingInstance(null)}
        />
      )}
      {cloningInstance && (
        <CloneMockServerModal
          instance={cloningInstance}
          workspacePath={resolveMockServerWorkspacePath(cloningInstance, workspaces, activeWorkspace)}
          workspaceCollections={workspaceCollections}
          activeWorkspace={activeWorkspace}
          onClose={() => setCloningInstance(null)}
        />
      )}
      {editingInstance && (
        <CreateMockServerModal
          editingInstance={editingInstance}
          onClose={() => setEditingInstance(null)}
          onDelete={(instance) => {
            setEditingInstance(null);
            setDeletingInstance(instance);
          }}
        />
      )}
      {deletingInstance && (
        <DeleteMockServerModal
          instance={deletingInstance}
          onClose={() => setDeletingInstance(null)}
        />
      )}
      <StyledWrapper>
        <div className="api-specs-list">
          {instanceLocations.map(({ instance, collection, location }) => (
            <MockServerItem
              instance={instance}
              collection={collection}
              workspaceCollections={workspaceCollections}
              activeWorkspace={activeWorkspace}
              apiSpecs={apiSpecs}
              preferences={preferences}
              workspaces={workspaces}
              location={location}
              key={instance.uid}
              onEditSettings={setEditingInstance}
              onRename={setRenamingInstance}
              onClone={setCloningInstance}
              onDelete={setDeletingInstance}
            />
          ))}
        </div>
      </StyledWrapper>
    </>
  );
};

export default MockServers;
