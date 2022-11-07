import React, { useState, useEffect } from 'react';
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

import StyledWrapper from './StyledWrapper';

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
  const collections = useSelector((state) => state.collections.collections);
  const screenWidth = useSelector((state) => state.app.screenWidth);

  let asideWidth = useSelector((state) => state.app.leftSidebarWidth);
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const [leftPaneWidth, setLeftPaneWidth] = useState(focusedTab && focusedTab.requestPaneWidth ? focusedTab.requestPaneWidth : (screenWidth - asideWidth) / 2.2); // 2.2 so that request pane is relatively smaller
  const [rightPaneWidth, setRightPaneWidth] = useState(screenWidth - asideWidth - leftPaneWidth - DEFAULT_PADDING);
  const [dragging, setDragging] = useState(false);

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
      if (leftPaneXPosition < (asideWidth+ DEFAULT_PADDING + MIN_LEFT_PANE_WIDTH) || leftPaneXPosition > (screenWidth - MIN_RIGHT_PANE_WIDTH )) {
        return;
      }
      setLeftPaneWidth(leftPaneXPosition- asideWidth);
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
    return <div className="pb-4 px-4">An error occured!</div>;
  }

  let collection = find(collections, (c) => c.uid === focusedTab.collectionUid);
  if (!collection || !collection.uid) {
    return <div className="pb-4 px-4">Collection not found!</div>;
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
    <StyledWrapper className={`flex flex-col flex-grow ${dragging ? 'dragging' : ''}`}>
      <div className="pt-4 pb-3 px-4">
        <QueryUrl item={item} collection={collection} handleRun={handleRun} />
      </div>
      <section className="main flex flex-grow pb-4">
        <section className="request-pane">
          <div className="px-4" style={{ width: `${Math.max(leftPaneWidth, MIN_LEFT_PANE_WIDTH)}px`, height: `calc(100% - ${DEFAULT_PADDING}px)` }}>
            {item.type === 'graphql-request' ? (
              <GraphQLRequestPane
                item={item}
                collection={collection}
                leftPaneWidth={leftPaneWidth}
              />
            ) : null}

            {item.type === 'http-request' ? <HttpRequestPane item={item} collection={collection} leftPaneWidth={leftPaneWidth} /> : null}
          </div>
        </section>

        <div className="drag-request" onMouseDown={handleDragbarMouseDown}>
          <div className="drag-request-border" />
        </div>

        <section className="response-pane flex-grow">
          <ResponsePane item={item} collection={collection} rightPaneWidth={rightPaneWidth} response={item.response} />
        </section>
      </section>
    </StyledWrapper>
  );
};

export default RequestTabPanel;