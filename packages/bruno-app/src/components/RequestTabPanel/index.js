import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import find from 'lodash/find';
import toast from 'react-hot-toast';
import { useSelector, useDispatch } from 'react-redux';
import GraphQLRequestPane from 'components/RequestPane/GraphQLRequestPane';
import HttpRequestPane from 'components/RequestPane/HttpRequestPane';
import GrpcRequestPane from 'components/RequestPane/GrpcRequestPane/index';
import ResponsePane from 'components/ResponsePane';
import GrpcResponsePane from 'components/ResponsePane/GrpcResponsePane';
import { findItemInCollection, findItemInCollectionByPathname, areItemsLoading } from 'utils/collections';
import { cancelRequest, sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import { updateGqlDocsOpen } from 'providers/ReduxStore/slices/tabs';
import RequestNotFound from './RequestNotFound';
import QueryUrl from 'components/RequestPane/QueryUrl/index';
import GrpcQueryUrl from 'components/RequestPane/GrpcQueryUrl/index';
import NetworkError from 'components/ResponsePane/NetworkError';
import RunnerResults from 'components/RunnerResults';
import VariablesEditor from 'components/VariablesEditor';
import CollectionSettings from 'components/CollectionSettings';
import { DocExplorer } from '@usebruno/graphql-docs';

import StyledWrapper from './StyledWrapper';
import FolderSettings from 'components/FolderSettings';
import { getGlobalEnvironmentVariables, getGlobalEnvironmentVariablesMasked } from 'utils/collections/index';
import { produce } from 'immer';
import CollectionOverview from 'components/CollectionSettings/Overview';
import RequestNotLoaded from './RequestNotLoaded';
import RequestIsLoading from './RequestIsLoading';
import RequestTabPanelLoading from './RequestTabPanelLoading';
import FolderNotFound from './FolderNotFound';
import ExampleNotFound from './ExampleNotFound';
import WsQueryUrl from 'components/RequestPane/WsQueryUrl';
import WSRequestPane from 'components/RequestPane/WSRequestPane';
import WSResponsePane from 'components/ResponsePane/WsResponsePane';
import { useTabPaneBoundaries } from 'hooks/useTabPaneBoundaries/index';
import useKeybinding from 'hooks/useKeybinding';
import { ScopedPersistenceProvider } from 'hooks/usePersistedState/PersistedScopeProvider';
import ResponseExample from 'components/ResponseExample';
import WorkspaceOverview from 'components/WorkspaceHome/WorkspaceOverview';
import Preferences from 'components/Preferences';
import EnvironmentSettings from 'components/Environments/EnvironmentSettings';
import GlobalEnvironmentSettings from 'components/Environments/GlobalEnvironmentSettings';
import OpenAPISyncTab from 'components/OpenAPISyncTab';
import OpenAPISpecTab from 'components/OpenAPISpecTab';
import CollapsedPanelIndicator from './CollapsedPanelIndicator';
import { IconLoader2 } from '@tabler/icons';

const MIN_LEFT_PANE_WIDTH = 300;
const MIN_RIGHT_PANE_WIDTH = 490;
const MIN_TOP_PANE_HEIGHT = 150;
const MIN_BOTTOM_PANE_HEIGHT = 150;
const COLLAPSE_EDGE_THRESHOLD = 80;
const EXPAND_EDGE_THRESHOLD = 100;

const RequestTabPanel = () => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const { globalEnvironments, activeGlobalEnvironmentUid } = useSelector((state) => state.globalEnvironments);
  const _collections = useSelector((state) => state.collections.collections);
  const preferences = useSelector((state) => state.app.preferences);
  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid);
  const isVerticalLayout = preferences?.layout?.responsePaneOrientation === 'vertical';
  const isConsoleOpen = useSelector((state) => state.logs.isConsoleOpen);

  const isRequestTab = focusedTab && ['request', 'http-request', 'grpc-request', 'ws-request', 'graphql-request'].includes(focusedTab.type);
  useKeybinding('sendRequest', (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    handleRun();
    return false;
  }, { enabled: !!isRequestTab, deps: [isRequestTab] });

  // Use ref to avoid stale closure in event handlers
  const isVerticalLayoutRef = useRef(isVerticalLayout);
  useEffect(() => {
    isVerticalLayoutRef.current = isVerticalLayout;
  }, [isVerticalLayout]);

  // merge `globalEnvironmentVariables` into the active collection and rebuild `collections` immer proxy object
  const collections = produce(_collections, (draft) => {
    const collection = find(draft, (c) => c.uid === focusedTab?.collectionUid);

    if (collection) {
      // add selected global env variables to the collection object
      const globalEnvironmentVariables = getGlobalEnvironmentVariables({
        globalEnvironments,
        activeGlobalEnvironmentUid
      });
      const globalEnvSecrets = getGlobalEnvironmentVariablesMasked({ globalEnvironments, activeGlobalEnvironmentUid });
      collection.globalEnvironmentVariables = globalEnvironmentVariables;
      collection.globalEnvSecrets = globalEnvSecrets;
    }
  });

  const collection = find(collections, (c) => c.uid === focusedTab?.collectionUid);

  const isItemsLoading = useMemo(() => {
    return collection?.mountStatus === 'mounting' || areItemsLoading(collection);
  }, [collection?.mountStatus, collection]);

  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);

  const {
    left: leftPaneWidth,
    top: topPaneHeight,
    reset: resetPaneBoundaries,
    setTop: setTopPaneHeight,
    setLeft: setLeftPaneWidth,
    requestPaneCollapsed,
    responsePaneCollapsed,
    collapseRequest,
    expandRequest,
    collapseResponse,
    expandResponse
  } = useTabPaneBoundaries(activeTabUid);
  const previousTopPaneHeight = useRef(null); // Store height before devtools opens

  // Not a recommended pattern here to have the child component
  // make a callback to set state, but treating this as an exception
  const docExplorerRef = useRef(null);
  const mainSectionRef = useRef(null);

  const [schema, setSchema] = useState(null);

  // Get gqlDocsOpen from Redux for persistence across tab switches
  const showGqlDocs = focusedTab?.gqlDocsOpen || false;

  const onSchemaLoad = useCallback((schema) => setSchema(schema), []);
  const toggleDocs = useCallback((value = null) => {
    const newValue = value !== null ? !!value : !showGqlDocs;
    dispatch(updateGqlDocsOpen({ uid: activeTabUid, gqlDocsOpen: newValue }));
  }, [dispatch, activeTabUid, showGqlDocs]);

  const handleGqlClickReference = useCallback((reference) => {
    if (docExplorerRef.current) {
      docExplorerRef.current.showDocForReference(reference);
    }
    if (!showGqlDocs) {
      dispatch(updateGqlDocsOpen({ uid: activeTabUid, gqlDocsOpen: true }));
    }
  }, [dispatch, activeTabUid, showGqlDocs]);

  // Refs for panel collapse/expand functions and current collapsed state
  const collapseRequestRef = useRef(collapseRequest);
  const collapseResponseRef = useRef(collapseResponse);
  const expandRequestRef = useRef(expandRequest);
  const expandResponseRef = useRef(expandResponse);
  const requestPaneCollapsedRef = useRef(requestPaneCollapsed);
  const responsePaneCollapsedRef = useRef(responsePaneCollapsed);
  useEffect(() => {
    collapseRequestRef.current = collapseRequest;
    collapseResponseRef.current = collapseResponse;
    expandRequestRef.current = expandRequest;
    expandResponseRef.current = expandResponse;
    requestPaneCollapsedRef.current = requestPaneCollapsed;
    responsePaneCollapsedRef.current = responsePaneCollapsed;
  }, [collapseRequest, collapseResponse, expandRequest, expandResponse, requestPaneCollapsed, responsePaneCollapsed]);

  const stopDragging = useCallback(() => {
    draggingRef.current = false;
    setDragging(false);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!draggingRef.current || !mainSectionRef.current) return;

    e.preventDefault();
    const mainRect = mainSectionRef.current.getBoundingClientRect();

    if (isVerticalLayoutRef.current) {
      const newHeight = e.clientY - mainRect.top;
      const maxHeight = mainRect.height - MIN_BOTTOM_PANE_HEIGHT;
      const distanceFromBottom = mainRect.bottom - e.clientY;

      if (newHeight < COLLAPSE_EDGE_THRESHOLD) {
        if (!requestPaneCollapsedRef.current) collapseRequestRef.current();
        return;
      }

      if (distanceFromBottom < COLLAPSE_EDGE_THRESHOLD) {
        if (!responsePaneCollapsedRef.current) collapseResponseRef.current();
        return;
      }

      if (requestPaneCollapsedRef.current && newHeight < EXPAND_EDGE_THRESHOLD) return;
      if (responsePaneCollapsedRef.current && distanceFromBottom < EXPAND_EDGE_THRESHOLD) return;

      if (requestPaneCollapsedRef.current) expandRequestRef.current();
      if (responsePaneCollapsedRef.current) expandResponseRef.current();

      const clampedHeight = Math.max(MIN_TOP_PANE_HEIGHT, Math.min(newHeight, maxHeight));
      setTopPaneHeight(clampedHeight);
    } else {
      const newWidth = e.clientX - mainRect.left;
      const maxWidth = mainRect.width - MIN_RIGHT_PANE_WIDTH;
      const distanceFromRight = mainRect.right - e.clientX;

      if (newWidth < COLLAPSE_EDGE_THRESHOLD) {
        if (!requestPaneCollapsedRef.current) collapseRequestRef.current();
        return;
      }

      if (distanceFromRight < COLLAPSE_EDGE_THRESHOLD) {
        if (!responsePaneCollapsedRef.current) collapseResponseRef.current();
        return;
      }

      if (requestPaneCollapsedRef.current && newWidth < EXPAND_EDGE_THRESHOLD) return;
      if (responsePaneCollapsedRef.current && distanceFromRight < EXPAND_EDGE_THRESHOLD) return;

      if (requestPaneCollapsedRef.current) expandRequestRef.current();
      if (responsePaneCollapsedRef.current) expandResponseRef.current();

      const clampedWidth = Math.max(MIN_LEFT_PANE_WIDTH, Math.min(newWidth, maxWidth));
      setLeftPaneWidth(clampedWidth);
    }
  }, [setTopPaneHeight, setLeftPaneWidth]);

  const handleMouseUp = useCallback((e) => {
    if (draggingRef.current) {
      e.preventDefault();
      stopDragging();
    }
  }, [stopDragging]);

  const startDragging = useCallback((e) => {
    e.preventDefault();
    draggingRef.current = true;
    setDragging(true);
  }, []);

  const applyPointerResize = useCallback((e) => {
    if (!mainSectionRef.current) return;
    const mainRect = mainSectionRef.current.getBoundingClientRect();

    if (isVerticalLayoutRef.current) {
      const newHeight = e.clientY - mainRect.top;
      const maxHeight = mainRect.height - MIN_BOTTOM_PANE_HEIGHT;
      const clampedHeight = Math.max(MIN_TOP_PANE_HEIGHT, Math.min(newHeight, maxHeight));
      setTopPaneHeight(clampedHeight);
    } else {
      const newWidth = e.clientX - mainRect.left;
      const maxWidth = mainRect.width - MIN_RIGHT_PANE_WIDTH;
      const clampedWidth = Math.max(MIN_LEFT_PANE_WIDTH, Math.min(newWidth, maxWidth));
      setLeftPaneWidth(clampedWidth);
    }
  }, [setTopPaneHeight, setLeftPaneWidth]);

  const handleRequestIndicatorDragStart = useCallback((e) => {
    expandRequest();
    applyPointerResize(e);
    startDragging(e);
  }, [expandRequest, applyPointerResize, startDragging]);

  const handleResponseIndicatorDragStart = useCallback((e) => {
    expandResponse();
    applyPointerResize(e);
    startDragging(e);
  }, [expandResponse, applyPointerResize, startDragging]);

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseUp, handleMouseMove]);

  useEffect(() => {
    if (!isVerticalLayout) return;
    if (responsePaneCollapsed) return;

    if (isConsoleOpen) {
      // Store current height before reducing
      if (previousTopPaneHeight.current === null) {
        previousTopPaneHeight.current = topPaneHeight;
      }
      // Reduce request pane height to make room for response pane when devtools is open
      const maxHeight = 200;
      if (topPaneHeight > maxHeight) {
        setTopPaneHeight(maxHeight);
      }
    } else {
      // Restore previous height when devtools closes
      if (previousTopPaneHeight.current !== null) {
        setTopPaneHeight(previousTopPaneHeight.current);
        previousTopPaneHeight.current = null;
      }
    }
  }, [isConsoleOpen, isVerticalLayout, responsePaneCollapsed]);

  if (typeof window == 'undefined') {
    return <div></div>;
  }

  if (!activeTabUid || !focusedTab) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted">
        <IconLoader2 className="animate-spin" size={24} strokeWidth={1.5} />
        <span>Loading...</span>
      </div>
    );
  }

  if (focusedTab.type === 'global-environment-settings') {
    return <GlobalEnvironmentSettings />;
  }

  if (focusedTab.type === 'preferences') {
    return <Preferences />;
  }

  if (focusedTab.type === 'workspaceOverview') {
    return activeWorkspace ? <WorkspaceOverview workspace={activeWorkspace} /> : null;
  }

  if (focusedTab.type === 'workspaceEnvironments') {
    return <GlobalEnvironmentSettings />;
  }

  if (!focusedTab.uid || !focusedTab.collectionUid) {
    return <div className="pb-4 px-4">An error occurred!</div>;
  }

  if (!collection || !collection.uid) {
    return <div className="pb-4 px-4">Collection not found!</div>;
  }

  if (focusedTab.type === 'response-example') {
    let item = findItemInCollection(collection, focusedTab.itemUid);
    if (!item && focusedTab.pathname) {
      item = findItemInCollectionByPathname(collection, focusedTab.pathname);
    }

    let example = null;
    if (item?.examples) {
      example = item.examples.find((ex) => ex.uid === focusedTab.uid);
      if (!example && typeof focusedTab.exampleIndex === 'number' && focusedTab.exampleIndex >= 0) {
        example = item.examples[focusedTab.exampleIndex] || null;
      }
      if (!example && focusedTab.exampleName) {
        example = item.examples.find((ex) => ex.name === focusedTab.exampleName);
      }
    }

    if (example) {
      return <ResponseExample item={item} collection={collection} example={example} />;
    }

    const displayName = focusedTab.exampleName || focusedTab.name;
    if (displayName && isItemsLoading) {
      return <RequestTabPanelLoading name={displayName} />;
    }
    return <ExampleNotFound itemUid={focusedTab.itemUid} exampleUid={focusedTab.uid} />;
  }

  let item = findItemInCollection(collection, activeTabUid);
  if (!item && focusedTab.pathname) {
    item = findItemInCollectionByPathname(collection, focusedTab.pathname);
  }
  const isGrpcRequest = item?.type === 'grpc-request';
  const isWsRequest = item?.type === 'ws-request';

  if (focusedTab.type === 'collection-runner') {
    return <RunnerResults collection={collection} />;
  }

  if (focusedTab.type === 'variables') {
    return <VariablesEditor collection={collection} />;
  }

  if (focusedTab.type === 'collection-settings') {
    return (
      <ScopedPersistenceProvider scope={focusedTab.uid}>
        <CollectionSettings collection={collection} />
      </ScopedPersistenceProvider>
    );
  }

  if (focusedTab.type === 'collection-overview') {
    return <CollectionOverview collection={collection} />;
  }

  if (focusedTab.type === 'folder-settings') {
    let folder = findItemInCollection(collection, focusedTab.folderUid);
    if (!folder && focusedTab.pathname) {
      folder = findItemInCollectionByPathname(collection, focusedTab.pathname);
    }

    if (folder) {
      return (
        <ScopedPersistenceProvider scope={focusedTab.uid}>
          <FolderSettings collection={collection} folder={folder} />;
        </ScopedPersistenceProvider>
      );
    }

    if (focusedTab.name && isItemsLoading) {
      return <RequestTabPanelLoading name={focusedTab.name} />;
    }
    return <FolderNotFound folderUid={focusedTab.folderUid} />;
  }

  if (focusedTab.type === 'environment-settings') {
    return <EnvironmentSettings collection={collection} />;
  }

  if (focusedTab.type === 'openapi-sync') {
    return <OpenAPISyncTab collection={collection} />;
  }

  if (focusedTab.type === 'openapi-spec') {
    return <OpenAPISpecTab collection={collection} tabUid={focusedTab.uid} />;
  }

  if (!item || !item.uid) {
    const showLoading = focusedTab.name && isItemsLoading;
    return showLoading
      ? <RequestTabPanelLoading name={focusedTab.name} />
      : <RequestNotFound itemUid={activeTabUid} />;
  }

  if (item.partial) {
    return <RequestNotLoaded item={item} collection={collection} />;
  }

  if (item.loading) {
    return <RequestIsLoading item={item} />;
  }

  const handleRun = async () => {
    const request = item.draft ? item.draft.request : item.request;

    if (isGrpcRequest && !request.url) {
      toast.error('Please enter a valid gRPC server URL');
      return;
    }

    if (isGrpcRequest && !request.method) {
      toast.error('Please select a gRPC method');
      return;
    }

    if (isWsRequest && !request.url) {
      toast.error('Please enter a valid WebSocket URL');
      return;
    }
    if (item.requestState !== 'sending' && item.requestState !== 'queued') {
      dispatch(sendRequest(item, collection.uid)).catch((err) =>
        toast.custom((t) => <NetworkError onClose={() => toast.dismiss(t.id)} />, {
          duration: 5000
        }));
    }
  };
  const renderQueryUrl = () => {
    if (isGrpcRequest) {
      return <GrpcQueryUrl item={item} collection={collection} handleRun={handleRun} />;
    }
    if (isWsRequest) {
      return <WsQueryUrl item={item} collection={collection} handleRun={handleRun} />;
    }
    return <QueryUrl item={item} collection={collection} handleRun={handleRun} />;
  };

  const renderRequestPane = () => {
    switch (item.type) {
      case 'graphql-request':
        return (
          <GraphQLRequestPane
            item={item}
            collection={collection}
            onSchemaLoad={onSchemaLoad}
            toggleDocs={toggleDocs}
            handleGqlClickReference={handleGqlClickReference}
          />
        );
      case 'http-request':
        return <HttpRequestPane item={item} collection={collection} />;
      case 'grpc-request':
        return <GrpcRequestPane item={item} collection={collection} handleRun={handleRun} />;
      case 'ws-request':
        return <WSRequestPane item={item} collection={collection} handleRun={handleRun} />;
      default:
        return null;
    }
  };

  const renderResponsePane = () => {
    switch (item.type) {
      case 'grpc-request':
        return <GrpcResponsePane item={item} collection={collection} response={item.response} />;
      case 'ws-request':
        return <WSResponsePane item={item} collection={collection} response={item.response} />;
      default:
        return <ResponsePane item={item} collection={collection} response={item.response} />;
    }
  };

  const getRequestPaneStyle = () => {
    if (responsePaneCollapsed) {
      return isVerticalLayout
        ? { flex: 1, width: '100%' }
        : { flex: 1 };
    }

    return isVerticalLayout
      ? {
          height: `${Math.max(topPaneHeight, MIN_TOP_PANE_HEIGHT)}px`,
          minHeight: `${MIN_TOP_PANE_HEIGHT}px`,
          width: '100%'
        }
      : {
          width: `${Math.max(leftPaneWidth, MIN_LEFT_PANE_WIDTH)}px`
        };
  };

  return (
    <ScopedPersistenceProvider scope={focusedTab.uid}>
      <StyledWrapper
        className={`flex flex-col flex-grow relative ${dragging ? 'dragging' : ''} ${isVerticalLayout ? 'vertical-layout' : ''
        } ${requestPaneCollapsed ? 'request-collapsed' : ''} ${responsePaneCollapsed ? 'response-collapsed' : ''}`}
      >
        <div className="query-url-wrapper pt-3 pb-4 px-4">
          {renderQueryUrl()}
        </div>
        <section ref={mainSectionRef} className={`main flex ${isVerticalLayout ? 'flex-col' : ''} flex-grow relative overflow-auto`}>
          {requestPaneCollapsed ? (
            <CollapsedPanelIndicator
              panelType="request"
              isVertical={isVerticalLayout}
              onExpand={expandRequest}
              onDragStart={handleRequestIndicatorDragStart}
              dragThresholdPx={isVerticalLayout ? MIN_TOP_PANE_HEIGHT / 2 : MIN_LEFT_PANE_WIDTH / 2}
            />
          ) : (
            <section className="request-pane" data-testid="request-pane" style={getRequestPaneStyle()}>
              <div className="px-4 h-full">
                {renderRequestPane()}
              </div>
            </section>
          )}

          {!requestPaneCollapsed && !responsePaneCollapsed && (
            <div
              className="dragbar-wrapper"
              onDoubleClick={(e) => {
                e.preventDefault();
                resetPaneBoundaries();
              }}
              onMouseDown={startDragging}
            >
              <div className="dragbar-handle" />
            </div>
          )}

          {responsePaneCollapsed ? (
            <CollapsedPanelIndicator
              panelType="response"
              isVertical={isVerticalLayout}
              onExpand={expandResponse}
              onDragStart={handleResponseIndicatorDragStart}
              dragThresholdPx={isVerticalLayout ? MIN_BOTTOM_PANE_HEIGHT / 2 : MIN_RIGHT_PANE_WIDTH / 2}
            />
          ) : (
            <section className="response-pane flex-grow overflow-x-auto" data-testid="response-pane" style={requestPaneCollapsed ? { flex: 1 } : undefined}>
              {renderResponsePane()}
            </section>
          )}
        </section>

        {item.type === 'graphql-request' ? (
          <div className={`graphql-docs-explorer-container ${showGqlDocs ? '' : 'hidden'}`}>
            <DocExplorer schema={schema} ref={(r) => (docExplorerRef.current = r)}>
              <button className="mr-2" data-testid="graphql-docs-close-button" onClick={() => toggleDocs(false)} aria-label="Close Documentation Explorer">
                {'\u2715'}
              </button>
            </DocExplorer>
          </div>
        ) : null}
        {dragging ? (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              cursor: isVerticalLayout ? 'row-resize' : 'col-resize',
              userSelect: 'none'
            }}
          />
        ) : null}
      </StyledWrapper>
    </ScopedPersistenceProvider>
  );
};

export default RequestTabPanel;
