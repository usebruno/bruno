import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  createMockResponse,
  deleteMockResponse,
  generateMockResponsesFromSpec,
  loadMockResponses,
  saveMockResponse,
  syncMockResponsesFromExamples
} from 'providers/ReduxStore/slices/mock-server';
import { addTab, closeTabs, updateTabMeta } from 'providers/ReduxStore/slices/tabs';
import { removeMockResponseEditor } from 'providers/ReduxStore/slices/collections/mockResponseEditorActions';
import {
  buildMockServerTryUrl,
  collectCollectionExamples,
  copyExampleToMockResponse,
  resolveMockResponseLocation,
  syncMockResponsesFromExamples as mergeMockResponsesFromExamples
} from 'utils/mock-responses';
import { resolveInstanceSpec } from 'utils/mock-server-instances';
import { IconCopy, IconSearch, IconServer2, IconTrash } from '@tabler/icons';
import CreateMockResponsePanel from '../CreateMockResponsePanel';
import DeleteMockResponseModal from '../DeleteMockResponseModal';
import GenerateFromSpecModal from '../GenerateFromSpecModal';
import SyncFromExamplesModal from '../SyncFromExamplesModal';
import Button from 'ui/Button';
import ActionIcon from 'ui/ActionIcon';
import StyledWrapper from './StyledWrapper';

const MockResponsesList = ({ instance, collection }) => {
  const dispatch = useDispatch();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [deletingResponse, setDeletingResponse] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const collections = useSelector((state) => state.collections.collections);
  const workspaces = useSelector((state) => state.workspaces.workspaces);
  const activeWorkspaceUid = useSelector((state) => state.workspaces.activeWorkspaceUid);
  const apiSpecs = useSelector((state) => state.apiSpec.apiSpecs);
  const responses = useSelector((state) => state.mockServer.mockResponses[instance.uid] || []);
  const serverState = useSelector((state) => state.mockServer.servers[instance.uid]);
  const isSharedMode = useSelector((state) => state.app.preferences?.mockServer?.mode === 'shared');
  const mockServerPort = serverState?.port || instance.port;
  const sharedSlug = serverState?.slug || null;

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

  const handleCopyUrl = async (event, response) => {
    event.stopPropagation();

    try {
      const url = buildMockServerTryUrl({
        port: mockServerPort,
        requestUrl: response.request?.url,
        sharedSlug,
        isSharedMode,
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
        <DeleteMockResponseModal
          response={deletingResponse}
          isDeleting={isDeleting}
          onClose={() => {
            if (!isDeleting) {
              setDeletingResponse(null);
            }
          }}
          onConfirm={handleConfirmDelete}
        />
      ) : null}

      {showGenerateModal ? (
        <GenerateFromSpecModal
          specName={spec?.name || instance.specName}
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
        <SyncFromExamplesModal
          isSyncing={isSyncing}
          onClose={() => {
            if (!isSyncing) {
              setShowSyncModal(false);
            }
          }}
          onConfirm={handleConfirmSync}
        />
      ) : null}

      <div className="actions">
        <div className="actions-toolbar">
          <CreateMockResponsePanel
            collection={isSpecServer ? null : resolvedCollection}
            onCreate={handleCreate}
          />

          {isCollectionServer ? (
            <Button
              variant="outline"
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
              variant="outline"
              color="secondary"
              size="sm"
              onClick={handleGenerateFromSpec}
              disabled={isGenerating || !spec?.pathname}
              data-testid="mock-response-generate-from-spec-btn"
            >
              {isGenerating ? 'Generating...' : 'Generate from API Spec'}
            </Button>
          ) : null}
        </div>

        {responses.length > 0 ? (
          <div className="search-bar">
            <IconSearch size={14} stroke={1.5} aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name, method, or endpoint"
              data-testid="mock-response-search-input"
            />
          </div>
        ) : null}
      </div>

      {responses.length === 0 ? (
        <div className="text-sm opacity-70">
          {isSpecServer ? (
            <>
              No mock responses yet. Generate them from your API spec, or create one manually and add rules to match requests.
            </>
          ) : (
            <>
              No mock responses yet. Create one to define routes and responses for this mock server.
            </>
          )}
        </div>
      ) : filteredResponses.length === 0 ? (
        <div className="text-sm opacity-70">No mock responses match your search.</div>
      ) : (
        <div className="response-list">
          {filteredResponses.map((response) => (
            <div
              key={response.uid}
              className="response-item"
              role="button"
              tabIndex={0}
              onClick={() => openResponseTab(response)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openResponseTab(response);
                }
              }}
            >
              <div className="response-item-body">
                <div className="response-item-header">
                  <IconServer2 size={14} stroke={1.5} className="response-item-icon" aria-hidden="true" />
                  <div className="response-item-name">{response.name}</div>
                </div>
                <div className="text-xs opacity-70 mt-1 pl-[22px]">
                  {(response.request?.method || 'GET').toUpperCase()} {response.request?.url}
                </div>
                <div className="text-xs opacity-60 mt-1 pl-[22px]">
                  {response.rules?.conditions?.length
                    ? `${response.rules.conditions.length} rule(s), ${response.rules.operator || 'AND'}`
                    : 'No rules (default match)'}
                </div>
              </div>

              <ActionIcon
                label="Copy mock URL"
                className="response-item-copy"
                onClick={(event) => handleCopyUrl(event, response)}
                data-testid={`mock-response-copy-${response.uid}`}
              >
                <IconCopy size={15} stroke={1.5} aria-hidden="true" />
              </ActionIcon>

              <ActionIcon
                label="Delete mock response"
                className="response-item-delete"
                onClick={(event) => {
                  event.stopPropagation();
                  setDeletingResponse(response);
                }}
                data-testid={`mock-response-delete-${response.uid}`}
              >
                <IconTrash size={15} stroke={1.5} aria-hidden="true" />
              </ActionIcon>
            </div>
          ))}
        </div>
      )}
    </StyledWrapper>
  );
};

export default MockResponsesList;
