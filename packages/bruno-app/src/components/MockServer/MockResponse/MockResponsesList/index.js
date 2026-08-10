import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  createMockResponse,
  deleteMockResponse,
  generateMockResponsesFromSpec,
  loadMockResponses,
  loadMockResponsesFromSpec,
  saveMockResponse,
  syncMockResponsesFromExamples
} from 'providers/ReduxStore/slices/mock-server/index';
import { addTab, closeTabs, updateTabMeta } from 'providers/ReduxStore/slices/tabs';
import { removeMockResponseEditor } from 'providers/ReduxStore/slices/collections';
import {
  buildMockServerTryUrl,
  collectCollectionExamples,
  copyExampleToMockResponse,
  resolveMockResponseLocation,
  syncMockResponsesFromExamples as mergeMockResponsesFromExamples,
  syncMockResponsesFromSpec as mergeMockResponsesFromSpec
} from 'utils/mock-server/mock-responses';
import { resolveInstanceSpec } from 'utils/mock-server/mock-server-instances';
import { IconCopy, IconPlus, IconServer2, IconTrash } from '@tabler/icons';
import CreateMockResponseModal from '../CreateMockResponseModal';
import GenerateFromSpecModal from '../GenerateFromSpecModal';
import MockConfirmModal from 'components/MockServer/MockConfirmModal';
import MockSearchInput from 'components/MockServer/MockSearchInput';
import Button from 'ui/Button';
import ActionIcon from 'ui/ActionIcon';
import ListGroup from 'ui/ListGroup';
import StyledWrapper from './StyledWrapper';

const MockResponsesList = ({ instance, collection }) => {
  const dispatch = useDispatch();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [deletingResponse, setDeletingResponse] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncSpecModal, setShowSyncSpecModal] = useState(false);
  const [isSyncingSpec, setIsSyncingSpec] = useState(false);
  const collections = useSelector((state) => state.collections.collections);
  const workspaces = useSelector((state) => state.workspaces.workspaces);
  const activeWorkspaceUid = useSelector((state) => state.workspaces.activeWorkspaceUid);
  const apiSpecs = useSelector((state) => state.apiSpec.apiSpecs);
  const responses = useSelector((state) => state.mockServer.mockResponses[instance.uid] || []);
  const serverState = useSelector((state) => state.mockServer.servers[instance.uid]);
  const mockServerPort = serverState?.port || instance.port;

  const resolvedCollection = useMemo(() => (
    collection || collections.find((item) => item.uid === instance.collectionUid) || null
  ), [collection, collections, instance.collectionUid]);

  const activeWorkspace = useMemo(() => (
    workspaces.find((workspace) => workspace.uid === activeWorkspaceUid) || null
  ), [workspaces, activeWorkspaceUid]);

  const location = useMemo(() => (
    resolveMockResponseLocation(instance, resolvedCollection, collections, workspaces, activeWorkspace)
  ), [instance, resolvedCollection, collections, workspaces, activeWorkspace]);

  const spec = useMemo(() => (
    resolveInstanceSpec(instance, apiSpecs)
  ), [instance, apiSpecs]);

  useEffect(() => {
    dispatch(loadMockResponses(location));
  }, [dispatch, location.mockServerUid, location.collectionPath, location.sourceType, location.workspacePath]);

  const openResponseTab = (response) => {
    dispatch(addTab({
      uid: response.uid,
      type: 'mock-response',
      mockServerUid: instance.uid,
      collectionUid: resolvedCollection?.uid || instance.collectionUid,
      responseName: response.name,
      tabName: response.name,
      preview: false
    }));
  };

  const handleCreate = async ({ name, description, statusCode, bodyType, exampleSelection }) => {
    try {
      if (exampleSelection) {
        const response = copyExampleToMockResponse(exampleSelection.example, exampleSelection.item);
        response.name = name;
        response.description = description;

        const result = await dispatch(saveMockResponse({
          ...location,
          response
        })).unwrap();

        openResponseTab(result.response);
        toast.success('Mock response created from example');
        return;
      }

      const result = await dispatch(createMockResponse({
        ...location,
        name,
        description,
        statusCode,
        bodyType
      })).unwrap();

      openResponseTab(result.response);
    } catch (err) {
      toast.error(err.message || 'Failed to create mock response');
      // rethrow so CreateMockResponseModal keeps itself open with the entered values
      throw err;
    }
  };

  const handleGenerateFromSpec = () => {
    if (!spec?.pathname) {
      toast.error('Open the API spec in this workspace first.');
      return;
    }

    setShowGenerateModal(true);
  };

  const handleConfirmGenerateFromSpec = async ({ generateFromSchema }) => {
    setIsGenerating(true);
    try {
      const result = await dispatch(generateMockResponsesFromSpec({
        ...location,
        specPath: spec.pathname,
        generateFromSchema
      })).unwrap();

      setShowGenerateModal(false);
      toast.success(`Generated ${result.createdCount} mock response(s) from API spec`);
    } catch (err) {
      toast.error(err.message || 'Failed to generate mock responses from spec');
    } finally {
      setIsGenerating(false);
    }
  };

  const isSpecServer = instance.sourceType === 'spec';
  const isCollectionServer = instance.sourceType === 'collection';

  const filteredResponses = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) {
      return responses;
    }

    return responses.filter((response) => {
      const name = response.name?.toLowerCase() || '';
      const method = (response.request?.method || 'GET').toLowerCase();
      const url = (response.request?.url || '').toLowerCase();
      return name.includes(normalized) || method.includes(normalized) || url.includes(normalized);
    });
  }, [responses, searchQuery]);

  const handleConfirmSync = async () => {
    if (!resolvedCollection?.items?.length) {
      toast.error('Collection is not loaded. Open the linked collection first.');
      return;
    }

    setIsSyncing(true);
    try {
      const exampleEntries = collectCollectionExamples(resolvedCollection);
      const previousNamesByUid = new Map(responses.map((response) => [response.uid, response.name]));
      const nextResponses = mergeMockResponsesFromExamples(responses, exampleEntries);

      await dispatch(syncMockResponsesFromExamples({
        ...location,
        responses: nextResponses
      })).unwrap();

      for (const response of nextResponses) {
        const previousName = previousNamesByUid.get(response.uid);
        if (previousName !== undefined && previousName !== response.name) {
          dispatch(updateTabMeta({
            uid: response.uid,
            tabName: response.name,
            responseName: response.name
          }));
        }
      }

      setShowSyncModal(false);
      toast.success('Mock responses synced with collection examples');
    } catch (err) {
      toast.error(err.message || 'Failed to sync mock responses');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncWithSpec = () => {
    if (!spec?.pathname) {
      toast.error('Open the API spec in this workspace first.');
      return;
    }

    setShowSyncSpecModal(true);
  };

  const handleConfirmSyncWithSpec = async () => {
    setIsSyncingSpec(true);
    try {
      const { responses: specResponses } = await dispatch(loadMockResponsesFromSpec({
        workspacePath: location.workspacePath,
        specPath: spec.pathname
      })).unwrap();

      const nextResponses = mergeMockResponsesFromSpec(responses, specResponses);

      await dispatch(syncMockResponsesFromExamples({
        ...location,
        responses: nextResponses
      })).unwrap();

      setShowSyncSpecModal(false);
      toast.success('Mock responses synced with spec');
    } catch (err) {
      toast.error(err.message || 'Failed to sync mock responses with spec');
    } finally {
      setIsSyncingSpec(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingResponse) {
      return;
    }

    setIsDeleting(true);
    try {
      await dispatch(deleteMockResponse({
        ...location,
        responseUid: deletingResponse.uid
      })).unwrap();

      dispatch(closeTabs({ tabUids: [deletingResponse.uid] }));
      dispatch(removeMockResponseEditor({ responseUid: deletingResponse.uid }));
      setDeletingResponse(null);
      toast.success('Mock response deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete mock response');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyUrl = async (response) => {
    try {
      const url = buildMockServerTryUrl({
        port: mockServerPort,
        requestUrl: response.request?.url,
        params: response.request?.params
      });
      await navigator.clipboard.writeText(url);
      toast.success('URL copied');
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  return (
    <StyledWrapper>
      {deletingResponse ? (
        <MockConfirmModal
          title="Delete Mock Response"
          confirmText={isDeleting ? 'Deleting...' : 'Delete'}
          confirmDisabled={isDeleting}
          confirmButtonColor="danger"
          dataTestId="delete-mock-response-modal"
          onClose={() => {
            if (!isDeleting) {
              setDeletingResponse(null);
            }
          }}
          onConfirm={handleConfirmDelete}
        >
          Are you sure you want to delete the mock response
          {' '}
          <span className="font-medium">{deletingResponse?.name}</span>
          ?
        </MockConfirmModal>
      ) : null}

      {showGenerateModal ? (
        <GenerateFromSpecModal
          specName={spec?.name || instance.specPath}
          isGenerating={isGenerating}
          onClose={() => {
            if (!isGenerating) {
              setShowGenerateModal(false);
            }
          }}
          onConfirm={handleConfirmGenerateFromSpec}
        />
      ) : null}

      {showSyncModal ? (
        <MockConfirmModal
          title="Sync with Collection Examples"
          confirmText={isSyncing ? 'Syncing...' : 'Sync'}
          confirmDisabled={isSyncing}
          dataTestId="sync-mock-examples-modal"
          onClose={() => {
            if (!isSyncing) {
              setShowSyncModal(false);
            }
          }}
          onConfirm={handleConfirmSync}
        >
          <p>
            Mock responses that match collection examples will be overwritten with the latest example data.
          </p>
          <p className="mt-3 text-sm opacity-80">
            Custom mock responses without a matching example will be kept.
          </p>
        </MockConfirmModal>
      ) : null}

      {showSyncSpecModal ? (
        <MockConfirmModal
          title="Sync with API Spec"
          confirmText={isSyncingSpec ? 'Syncing...' : 'Sync'}
          confirmDisabled={isSyncingSpec}
          dataTestId="mock-response-sync-spec-modal"
          onClose={() => {
            if (!isSyncingSpec) {
              setShowSyncSpecModal(false);
            }
          }}
          onConfirm={handleConfirmSyncWithSpec}
        >
          <p>
            Mock responses matching an endpoint in
            {' '}
            <span className="font-medium">{spec?.name || instance.specPath || 'this API spec'}</span>
            {' '}
            will be overwritten with the latest spec data (bodies generated from schema).
          </p>
          <p className="mt-3 text-sm opacity-80">
            Custom mock responses without a matching endpoint will be kept.
          </p>
        </MockConfirmModal>
      ) : null}

      {showCreateModal ? (
        <CreateMockResponseModal
          collection={isSpecServer ? null : resolvedCollection}
          existingResponses={responses}
          onCreate={handleCreate}
          onClose={() => setShowCreateModal(false)}
        />
      ) : null}

      <div className="actions">
        <div className="actions-toolbar">
          <Button
            size="sm"
            icon={<IconPlus size={14} stroke={1.75} />}
            onClick={() => setShowCreateModal(true)}
            data-testid="mock-response-create-btn"
          >
            New Mock Response
          </Button>

          {isCollectionServer ? (
            <Button
              color="secondary"
              size="sm"
              onClick={() => setShowSyncModal(true)}
              disabled={!resolvedCollection}
              data-testid="mock-response-sync-examples-btn"
            >
              Sync with Examples
            </Button>
          ) : null}

          {isSpecServer ? (
            <Button
              color="secondary"
              size="sm"
              onClick={handleGenerateFromSpec}
              disabled={isGenerating || !spec?.pathname}
              data-testid="mock-response-generate-from-spec-btn"
            >
              {isGenerating ? 'Generating...' : 'Generate from API Spec'}
            </Button>
          ) : null}

          {isSpecServer && responses.length > 0 ? (
            <Button
              color="secondary"
              size="sm"
              onClick={handleSyncWithSpec}
              disabled={!spec?.pathname}
              data-testid="mock-response-sync-spec-btn"
            >
              Sync with Spec
            </Button>
          ) : null}
        </div>

        {responses.length > 0 ? (
          <MockSearchInput
            className="response-search"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name, method, or endpoint"
            data-testid="mock-response-search-input"
          />
        ) : null}
      </div>

      <ListGroup
        maxWidth="100%"
        items={filteredResponses}
        getKey={(response) => response.uid}
        emptyState={{
          icon: <IconServer2 size={22} stroke={1.5} aria-hidden="true" />,
          title: responses.length ? 'No matching mock responses' : 'No mock responses yet',
          text: responses.length
            ? 'No mock response matches your search.'
            : isSpecServer
              ? 'Generate them from your API spec, or create one manually and add rules to match requests.'
              : 'Create one to define the routes and responses this mock server serves.'
        }}
        renderItem={(response) => (
          <ListGroup.Item
            leading={<IconServer2 size={14} stroke={1.5} className="response-item-icon" aria-hidden="true" />}
            actions={(
              <>
                <ActionIcon
                  label="Copy mock URL"
                  onClick={() => handleCopyUrl(response)}
                  data-testid={`mock-response-copy-${response.uid}`}
                >
                  <IconCopy size={15} stroke={1.5} aria-hidden="true" />
                </ActionIcon>
                <ActionIcon
                  label="Delete mock response"
                  onClick={() => setDeletingResponse(response)}
                  data-testid={`mock-response-delete-${response.uid}`}
                >
                  <IconTrash size={15} stroke={1.5} aria-hidden="true" />
                </ActionIcon>
              </>
            )}
            className="response-item"
          >
            <button
              type="button"
              className="response-item-open"
              onClick={() => openResponseTab(response)}
              data-testid={`mock-response-open-${response.uid}`}
            >
              <div className="response-item-name">{response.name}</div>
              <div className="response-item-endpoint">
                {(response.request?.method || 'GET').toUpperCase()} {response.request?.url}
              </div>
              <div className="response-item-rules">
                {response.rules?.conditions?.length
                  ? `${response.rules.conditions.length} rule(s), ${response.rules.operator || 'AND'}`
                  : 'No rules (default match)'}
              </div>
            </button>
          </ListGroup.Item>
        )}
      />
    </StyledWrapper>
  );
};

export default MockResponsesList;
