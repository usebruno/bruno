import React, { useState, useEffect, useRef } from 'react';
import find from 'lodash/find';
import toast from 'react-hot-toast';
import { useSelector, useDispatch } from 'react-redux';
import GraphQLRequestPane from 'components/RequestPane/GraphQLRequestPane';
import HttpRequestPane from 'components/RequestPane/HttpRequestPane';
import ResponsePane from 'components/ResponsePane';
import Welcome from 'components/Welcome';
import { findItemInCollection } from 'utils/collections';
import { updateRequestPaneTabWidth } from 'providers/ReduxStore/slices/tabs';
import { sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import RequestNotFound from './RequestNotFound';
import QueryUrl from 'components/RequestPane/QueryUrl';
import NetworkError from 'components/ResponsePane/NetworkError';
import RunnerResults from 'components/RunnerResults';
import VariablesEditor from 'components/VariablesEditor';
import CollectionSettings from 'components/CollectionSettings';
import { DocExplorer } from '@usebruno/graphql-docs';

import StyledWrapper from './StyledWrapper';
import SecuritySettings from 'components/SecuritySettings';
import FolderSettings from 'components/FolderSettings';
import { getGlobalEnvironmentVariables } from 'utils/collections/index';
import { produce } from 'immer';

const MIN_LEFT_PANE_WIDTH = 300;
const MIN_RIGHT_PANE_WIDTH = 350;
const DEFAULT_PADDING = 5;

const RequestTabPanel = () => {
  if (typeof window == 'undefined') {
    return <div></div>;
  }
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const { globalEnvironments, activeGlobalEnvironmentUid } = useSelector((state) => state.globalEnvironments);
  const _collections = useSelector((state) => state.collections.collections);

  // merge `globalEnvironmentVariables` into the active collection and rebuild `collections` immer proxy object
  let collections = produce(_collections, draft => {
    let collection = find(draft, (c) => c.uid === focusedTab?.collectionUid);

    if (collection) {
      // add selected global env variables to the collection object
      const globalEnvironmentVariables = getGlobalEnvironmentVariables({ globalEnvironments, activeGlobalEnvironmentUid });
      collection.globalEnvironmentVariables = globalEnvironmentVariables;
    }
  });

  let collection = find(collections, (c) => c.uid === focusedTab?.collectionUid);

  const screenWidth = useSelector((state) => state.app.screenWidth);
  let asideWidth = useSelector((state) => state.app.leftSidebarWidth);
  const [leftPaneWidth, setLeftPaneWidth] = useState(
    focusedTab && focusedTab.requestPaneWidth ? focusedTab.requestPaneWidth : (screenWidth - asideWidth) / 2.2
  ); // 2.2 so that request pane is relatively smaller
  const [rightPaneWidth, setRightPaneWidth] = useState(screenWidth - asideWidth - leftPaneWidth - DEFAULT_PADDING);
  const [dragging, setDragging] = useState(false);

  // Not a recommended pattern here to have the child component
  // make a callback to set state, but treating this as an exception
  const docExplorerRef = useRef(null);
  const [schema, setSchema] = useState(null);
  const [showGqlDocs, setShowGqlDocs] = useState(false);
  const onSchemaLoad = (schema) => setSchema(schema);
  const toggleDocs = () => setShowGqlDocs((showGqlDocs) => !showGqlDocs);
  const handleGqlClickReference = (reference) => {
    if (docExplorerRef.current) {
      docExplorerRef.current.showDocForReference(reference);
    }
    if (!showGqlDocs) {
      setShowGqlDocs(true);
    }
  };

  useEffect(() => {
    const leftPaneWidth = (screenWidth - asideWidth) / 2.2;
    setLeftPaneWidth(leftPaneWidth);
  }, [screenWidth]);

  useEffect(() => {
    setRightPaneWidth(screenWidth - asideWidth - leftPaneWidth - DEFAULT_PADDING);
  }, [screenWidth, asideWidth, leftPaneWidth]);

  const handleMouseMove = (e) => {
    if (dragging) {
      e.preventDefault();
      let leftPaneXPosition = e.clientX + 2;
      if (
        leftPaneXPosition < asideWidth + DEFAULT_PADDING + MIN_LEFT_PANE_WIDTH ||
        leftPaneXPosition > screenWidth - MIN_RIGHT_PANE_WIDTH
      ) {
        return;
      }
      setLeftPaneWidth(leftPaneXPosition - asideWidth);
      setRightPaneWidth(screenWidth - e.clientX - DEFAULT_PADDING);
    }
  };
  const handleMouseUp = (e) => {
    if (dragging) {
      e.preventDefault();
      setDragging(false);
      dispatch(
        updateRequestPaneTabWidth({
          uid: activeTabUid,
          requestPaneWidth: e.clientX - asideWidth - DEFAULT_PADDING
        })
      );
    }
  };
  const handleDragbarMouseDown = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [dragging, asideWidth]);

  if (!activeTabUid) {
    return <Welcome />;
  }

  if (!focusedTab || !focusedTab.uid || !focusedTab.collectionUid) {
    return <div className="pb-4 px-4">An error occurred!</div>;
  }

  if (!collection || !collection.uid) {
    return <div className="pb-4 px-4">Collection not found!</div>;
  }

  if (focusedTab.type === 'collection-runner') {
    return <RunnerResults collection={collection} />;
  }

  if (focusedTab.type === 'variables') {
    return <VariablesEditor collection={collection} />;
  }

  if (focusedTab.type === 'collection-settings') {
    return <CollectionSettings collection={collection} />;
  }
  if (focusedTab.type === 'folder-settings') {
    const folder = findItemInCollection(collection, focusedTab.folderUid);
    return <FolderSettings collection={collection} folder={folder} />;
  }

  if (focusedTab.type === 'security-settings') {
    return <SecuritySettings collection={collection} />;
  }

  const item = findItemInCollection(collection, activeTabUid);
  if (!item || !item.uid) {
    return <RequestNotFound itemUid={activeTabUid} />;
  }

  const handleRun = async () => {
    dispatch(sendRequest(item, collection.uid)).catch((err) =>
      toast.custom((t) => <NetworkError onClose={() => toast.dismiss(t.id)} />, {
        duration: 5000
      })
    );
  };

  return (
    <StyledWrapper className={`flex flex-col flex-grow relative ${dragging ? 'dragging' : ''}`}>
      <div className="pt-4 pb-3 px-4">
        <QueryUrl item={item} collection={collection} handleRun={handleRun} />
      </div>
      <section className="main flex flex-grow pb-4 relative">
        <section className="request-pane">
          <div
            className="px-4 h-full"
            style={{
              width: `${Math.max(leftPaneWidth, MIN_LEFT_PANE_WIDTH)}px`
            }}
          >
            {item.type === 'graphql-request' ? (
              <GraphQLRequestPane
                item={item}
                collection={collection}
                leftPaneWidth={leftPaneWidth}
                onSchemaLoad={onSchemaLoad}
                toggleDocs={toggleDocs}
                handleGqlClickReference={handleGqlClickReference}
              />
            ) : null}

            {item.type === 'http-request' ? (
              <HttpRequestPane item={item} collection={collection} leftPaneWidth={leftPaneWidth} />
            ) : null}
          </div>
        </section>

        <div className="drag-request" onMouseDown={handleDragbarMouseDown}>
          <div className="drag-request-border" />
        </div>

        <section className="response-pane flex-grow">
          <ResponsePane item={item} collection={collection} rightPaneWidth={rightPaneWidth} response={item.response} />
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

export default RequestTabPanel;
