import React, { useState, useEffect, useRef, useCallback } from 'react';
import find from 'lodash/find';
import toast from 'react-hot-toast';
import { useSelector, useDispatch } from 'react-redux';
import GraphQLRequestPane from 'components/RequestPane/GraphQLRequestPane';
import HttpRequestPane from 'components/RequestPane/HttpRequestPane';
import GrpcRequestPane from 'components/RequestPane/GrpcRequestPane/index';
import ResponsePane from 'components/ResponsePane';
import GrpcResponsePane from 'components/ResponsePane/GrpcResponsePane';
import { findItemInCollection } from 'utils/collections';
import { cancelRequest, sendRequest } from 'providers/ReduxStore/slices/collections/actions';
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
import FolderNotFound from './FolderNotFound';
import ExampleNotFound from './ExampleNotFound';
import WsQueryUrl from 'components/RequestPane/WsQueryUrl';
import WSRequestPane from 'components/RequestPane/WSRequestPane';
import WSResponsePane from 'components/ResponsePane/WsResponsePane';
import { useTabPaneBoundaries } from 'hooks/useTabPaneBoundaries/index';
import ResponseExample from 'components/ResponseExample';
import WorkspaceOverview from 'components/WorkspaceHome/WorkspaceOverview';
import Preferences from 'components/Preferences';
import EnvironmentSettings from 'components/Environments/EnvironmentSettings';
import GlobalEnvironmentSettings from 'components/Environments/GlobalEnvironmentSettings';
import OpenAPISyncTab from 'components/OpenAPISyncTab';
import OpenAPISpecTab from 'components/OpenAPISpecTab';
import CollapsedPanelIndicator from './CollapsedPanelIndicator';

const MIN_LEFT_PANE_WIDTH = 300;
const MIN_RIGHT_PANE_WIDTH = 490;
const MIN_TOP_PANE_HEIGHT = 150;
const MIN_BOTTOM_PANE_HEIGHT = 150;
const COLLAPSE_EDGE_THRESHOLD = 80;

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
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const dragStartRef = useRef(null);

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
  const [showGqlDocs, setShowGqlDocs] = useState(false);
  const onSchemaLoad = useCallback((schema) => setSchema(schema), []);
  const toggleDocs = useCallback(() => setShowGqlDocs((prev) => !prev), []);

  const handleGqlClickReference = useCallback((reference) => {
    if (docExplorerRef.current) {
      docExplorerRef.current.showDocForReference(reference);
    }
    if (!showGqlDocs) {
      setShowGqlDocs(true);
    }
  }, []);

  // Refs for panel collapse functions
  const collapseRequestRef = useRef(collapseRequest);
  const collapseResponseRef = useRef(collapseResponse);
  useEffect(() => {
    collapseRequestRef.current = collapseRequest;
    collapseResponseRef.current = collapseResponse;
  }, [collapseRequest, collapseResponse]);

  const stopDragging = useCallback(() => {
    draggingRef.current = false;
    dragStartRef.current = null;
    setDragging(false);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!draggingRef.current || !mainSectionRef.current || !dragStartRef.current) return;

    e.preventDefault();
    const mainRect = mainSectionRef.current.getBoundingClientRect();
    const dragStart = dragStartRef.current;

    if (isVerticalLayoutRef.current) {
      const newHeight = e.clientY - mainRect.top;
      const maxHeight = mainRect.height - MIN_BOTTOM_PANE_HEIGHT;
      const distanceFromBottom = mainRect.bottom - e.clientY;

      if (e.clientY < dragStart.y && newHeight < COLLAPSE_EDGE_THRESHOLD) {
        collapseRequestRef.current();
        return stopDragging();
      }

      if (e.clientY > dragStart.y && distanceFromBottom < COLLAPSE_EDGE_THRESHOLD) {
        collapseResponseRef.current();
        return stopDragging();
      }

      const clampedHeight = Math.max(MIN_TOP_PANE_HEIGHT, Math.min(newHeight, maxHeight));
      setTopPaneHeight(clampedHeight);
    } else {
      const newWidth = e.clientX - mainRect.left;
      const maxWidth = mainRect.width - MIN_RIGHT_PANE_WIDTH;
      const distanceFromRight = mainRect.right - e.clientX;

      if (e.clientX < dragStart.x && newWidth < COLLAPSE_EDGE_THRESHOLD) {
        collapseRequestRef.current();
        return stopDragging();
      }

      if (e.clientX > dragStart.x && distanceFromRight < COLLAPSE_EDGE_THRESHOLD) {
        collapseResponseRef.current();
        return stopDragging();
      }

      const clampedWidth = Math.max(MIN_LEFT_PANE_WIDTH, Math.min(newWidth, maxWidth));
      setLeftPaneWidth(clampedWidth);
    }
  }, [setTopPaneHeight, setLeftPaneWidth, stopDragging]);

  const handleMouseUp = useCallback((e) => {
    if (draggingRef.current) {
      e.preventDefault();
      stopDragging();
    }
  }, [stopDragging]);

  const startDragging = useCallback((e) => {
    e.preventDefault();
    draggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
  }, []);

  const handleRequestIndicatorDragStart = useCallback((e) => {
    expandRequest();
    startDragging(e);
  }, [expandRequest, startDragging]);

  const handleResponseIndicatorDragStart = useCallback((e) => {
    expandResponse();
    startDragging(e);
  }, [expandResponse, startDragging]);

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
  }, [isConsoleOpen, isVerticalLayout]);

  if (typeof window == 'undefined') {
    return <div></div>;
  }

  if (!activeTabUid || !focusedTab) {
    return <div className="pb-4 px-4">Loading...</div>;
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
    const item = findItemInCollection(collection, focusedTab.itemUid);
    const example = item?.examples?.find((ex) => ex.uid === focusedTab.uid);

    if (!example) {
      return <ExampleNotFound itemUid={focusedTab.itemUid} exampleUid={focusedTab.uid} />;
    }
    return <ResponseExample item={item} collection={collection} example={example} />;
  }

  const item = findItemInCollection(collection, activeTabUid);
  const isGrpcRequest = item?.type === 'grpc-request';
  const isWsRequest = item?.type === 'ws-request';

  if (focusedTab.type === 'collection-runner') {
    return <RunnerResults collection={collection} />;
  }

  if (focusedTab.type === 'variables') {
    return <VariablesEditor collection={collection} />;
  }

  if (focusedTab.type === 'collection-settings') {
    return <CollectionSettings collection={collection} />;
  }

  if (focusedTab.type === 'collection-overview') {
    return <CollectionOverview collection={collection} />;
  }

  if (focusedTab.type === 'folder-settings') {
    const folder = findItemInCollection(collection, focusedTab.folderUid);
    if (!folder) {
      return <FolderNotFound folderUid={focusedTab.folderUid} />;
    }

    return <FolderSettings collection={collection} folder={folder} />;
  }

  if (focusedTab.type === 'environment-settings') {
    return <EnvironmentSettings collection={collection} />;
  }

  if (focusedTab.type === 'openapi-sync') {
    return <OpenAPISyncTab collection={collection} />;
  }

  if (focusedTab.type === 'openapi-spec') {
    return <OpenAPISpecTab collection={collection} />;
  }

  if (!item || !item.uid) {
    return <RequestNotFound itemUid={activeTabUid} />;
  }

  if (item?.partial) {
    return <RequestNotLoaded item={item} collection={collection} />;
  }

  if (item?.loading) {
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

    if (item.response?.stream?.running) {
      dispatch(cancelRequest(item.cancelTokenUid, item, collection)).catch((err) =>
        toast.custom((t) => <NetworkError onClose={() => toast.dismiss(t.id)} />, {
          duration: 5000
        }));
    } else if (item.requestState !== 'sending' && item.requestState !== 'queued') {
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
    <StyledWrapper
      className={`flex flex-col flex-grow relative ${dragging ? 'dragging' : ''} ${
        isVerticalLayout ? 'vertical-layout' : ''
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
          <section className="request-pane" style={getRequestPaneStyle()}>
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
          <section className="response-pane flex-grow overflow-x-auto" style={requestPaneCollapsed ? { flex: 1 } : undefined}>
            {renderResponsePane()}
          </section>
        )}
      </section>

      {item.type === 'graphql-request' ? (
        <div className={`graphql-docs-explorer-container ${showGqlDocs ? '' : 'hidden'}`}>
          <DocExplorer schema={schema} ref={(r) => (docExplorerRef.current = r)}>
            <button className="mr-2" onClick={toggleDocs} aria-label="Close Documentation Explorer">
              {'\u2715'}
            </button>
          </DocExplorer>
        </div>
      ) : null}
    </StyledWrapper>
  );
};

export default RequestTabPanel;
