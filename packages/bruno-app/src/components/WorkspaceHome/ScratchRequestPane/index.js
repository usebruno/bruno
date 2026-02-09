import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import GraphQLRequestPane from 'components/RequestPane/GraphQLRequestPane';
import HttpRequestPane from 'components/RequestPane/HttpRequestPane';
import GrpcRequestPane from 'components/RequestPane/GrpcRequestPane/index';
import ResponsePane from 'components/ResponsePane';
import GrpcResponsePane from 'components/ResponsePane/GrpcResponsePane';
import QueryUrl from 'components/RequestPane/QueryUrl/index';
import GrpcQueryUrl from 'components/RequestPane/GrpcQueryUrl/index';
import WsQueryUrl from 'components/RequestPane/WsQueryUrl';
import WSRequestPane from 'components/RequestPane/WSRequestPane';
import WSResponsePane from 'components/ResponsePane/WsResponsePane';
import NetworkError from 'components/ResponsePane/NetworkError';
import { DocExplorer } from '@usebruno/graphql-docs';
import { getGlobalEnvironmentVariables, getGlobalEnvironmentVariablesMasked } from 'utils/collections/index';
import { produce } from 'immer';
import { useTabPaneBoundaries } from 'hooks/useTabPaneBoundaries/index';

import StyledWrapper from './StyledWrapper';

const MIN_LEFT_PANE_WIDTH = 300;
const MIN_RIGHT_PANE_WIDTH = 490;
const MIN_TOP_PANE_HEIGHT = 150;
const MIN_BOTTOM_PANE_HEIGHT = 150;

const ScratchRequestPane = ({ item, scratchCollection, onSendRequest, onCancelRequest }) => {
  const { globalEnvironments, activeGlobalEnvironmentUid } = useSelector((state) => state.globalEnvironments);
  const preferences = useSelector((state) => state.app.preferences);
  const isVerticalLayout = preferences?.layout?.responsePaneOrientation === 'vertical';
  const isConsoleOpen = useSelector((state) => state.logs.isConsoleOpen);

  // Use ref to avoid stale closure in event handlers
  const isVerticalLayoutRef = useRef(isVerticalLayout);
  useEffect(() => {
    isVerticalLayoutRef.current = isVerticalLayout;
  }, [isVerticalLayout]);

  // Build collection-like object with global environment variables
  const collection = produce(scratchCollection, (draft) => {
    const globalEnvironmentVariables = getGlobalEnvironmentVariables({
      globalEnvironments,
      activeGlobalEnvironmentUid
    });
    const globalEnvSecrets = getGlobalEnvironmentVariablesMasked({
      globalEnvironments,
      activeGlobalEnvironmentUid
    });
    draft.globalEnvironmentVariables = globalEnvironmentVariables;
    draft.globalEnvSecrets = globalEnvSecrets;
  });

  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);

  const { left: leftPaneWidth, top: topPaneHeight, reset: resetPaneBoundaries, setTop: setTopPaneHeight, setLeft: setLeftPaneWidth } = useTabPaneBoundaries(item?.uid);
  const previousTopPaneHeight = useRef(null);

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
  }, [showGqlDocs]);

  const handleMouseMove = useCallback((e) => {
    if (!draggingRef.current || !mainSectionRef.current) return;

    e.preventDefault();
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

  const handleMouseUp = useCallback((e) => {
    if (draggingRef.current) {
      e.preventDefault();
      draggingRef.current = false;
      setDragging(false);
    }
  }, []);

  const handleDragbarMouseDown = useCallback((e) => {
    e.preventDefault();
    draggingRef.current = true;
    setDragging(true);
  }, []);

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
      if (previousTopPaneHeight.current === null) {
        previousTopPaneHeight.current = topPaneHeight;
      }
      const maxHeight = 200;
      if (topPaneHeight > maxHeight) {
        setTopPaneHeight(maxHeight);
      }
    } else {
      if (previousTopPaneHeight.current !== null) {
        setTopPaneHeight(previousTopPaneHeight.current);
        previousTopPaneHeight.current = null;
      }
    }
  }, [isConsoleOpen, isVerticalLayout, topPaneHeight, setTopPaneHeight]);

  if (!item) {
    return <div className="pb-4 px-4">Select a scratch request to edit.</div>;
  }

  const isGrpcRequest = item?.type === 'grpc-request';
  const isWsRequest = item?.type === 'ws-request';

  const handleRun = async () => {
    const request = item.draft ? item.draft.request : item.request;

    if (isGrpcRequest && !request?.url) {
      toast.error('Please enter a valid gRPC server URL');
      return;
    }

    if (isGrpcRequest && !request?.method) {
      toast.error('Please select a gRPC method');
      return;
    }

    if (isWsRequest && !request?.url) {
      toast.error('Please enter a valid WebSocket URL');
      return;
    }

    if (item.response?.stream?.running) {
      if (onCancelRequest) {
        onCancelRequest(item);
      }
    } else if (item.requestState !== 'sending' && item.requestState !== 'queued') {
      if (onSendRequest) {
        try {
          await onSendRequest(item, collection);
        } catch (err) {
          toast.custom((t) => <NetworkError onClose={() => toast.dismiss(t.id)} />, {
            duration: 5000
          });
        }
      }
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
        return <HttpRequestPane item={item} collection={collection} />;
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

  const requestPaneStyle = isVerticalLayout
    ? {
        height: `${Math.max(topPaneHeight, MIN_TOP_PANE_HEIGHT)}px`,
        minHeight: `${MIN_TOP_PANE_HEIGHT}px`,
        width: '100%'
      }
    : {
        width: `${Math.max(leftPaneWidth, MIN_LEFT_PANE_WIDTH)}px`
      };

  return (
    <StyledWrapper
      className={`flex flex-col flex-grow relative ${dragging ? 'dragging' : ''} ${
        isVerticalLayout ? 'vertical-layout' : ''
      }`}
    >
      <div className="pt-3 pb-3 px-4">
        {renderQueryUrl()}
      </div>
      <section ref={mainSectionRef} className={`main flex ${isVerticalLayout ? 'flex-col' : ''} flex-grow pb-4 relative overflow-auto`}>
        <section className="request-pane">
          <div
            className="px-4 h-full"
            style={requestPaneStyle}
          >
            {renderRequestPane()}
          </div>
        </section>

        <div
          className="dragbar-wrapper"
          onDoubleClick={(e) => {
            e.preventDefault();
            resetPaneBoundaries();
          }}
          onMouseDown={handleDragbarMouseDown}
        >
          <div className="dragbar-handle" />
        </div>

        <section className="response-pane flex-grow overflow-x-auto">
          {renderResponsePane()}
        </section>
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

export default ScratchRequestPane;
