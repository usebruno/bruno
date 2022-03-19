import React, { useState, useEffect } from 'react';
import find from 'lodash/find';
import { useSelector, useDispatch } from 'react-redux';
import QueryUrl from 'components/RequestPane/QueryUrl';
import GraphQLRequestPane from 'components/RequestPane/GraphQLRequestPane';
import HttpRequestPane from 'components/RequestPane/HttpRequestPane';
import ResponsePane from 'components/ResponsePane';
import Welcome from 'components/Welcome';
import { findItemInCollection } from 'utils/collections';
import { sendRequest, requestUrlChanged } from 'providers/ReduxStore/slices/collections';
import { requestChanged } from 'providers/ReduxStore/slices/tabs';
import useGraphqlSchema from '../../hooks/useGraphqlSchema';

import StyledWrapper from './StyledWrapper';

const RequestTabPanel = () => {
  if(typeof window == 'undefined') {
    return <div></div>;
  }
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const collections = useSelector((state) => state.collections.collections);
  const dispatch = useDispatch();

  let asideWidth = 270;
  let {
    schema 
  } = useGraphqlSchema('https://api.spacex.land/graphql');
  const [leftPaneWidth, setLeftPaneWidth] = useState((window.innerWidth - asideWidth)/2 - 10); // 10 is for dragbar
  const [rightPaneWidth, setRightPaneWidth] = useState((window.innerWidth - asideWidth)/2);
  const [dragging, setDragging] = useState(false);
  const handleMouseMove = (e) => {
    if(dragging) {
      e.preventDefault();
      setLeftPaneWidth(e.clientX - asideWidth);
      setRightPaneWidth(window.innerWidth - (e.clientX));
    }
  };
  const handleMouseUp = (e) => {
    if(dragging) {
      e.preventDefault();
      setDragging(false);
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
  }, [dragging, leftPaneWidth]);

  const onGraphqlQueryChange = (value) => {
    // todo
  };

  if(!activeTabUid) {
    return (
      <Welcome/>
    );
  }

  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);

  if(!focusedTab || !focusedTab.uid || !focusedTab.collectionUid) {
    return (
      <div className="pb-4 px-4">An error occured!</div>
    );
  }

  let collection = find(collections, (c) => c.uid === focusedTab.collectionUid);
  if(!collection || !collection.uid) {
    return (
      <div className="pb-4 px-4">Collection not found!</div>
    );
  }

  const item = findItemInCollection(collection, activeTabUid);
  if(!item || !item.uid) {
    return (
      <StyledWrapper>
        Request not found!
      </StyledWrapper>
    );
  }

  const onUrlChange = (value) => {
    dispatch(requestChanged({
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
    dispatch(requestUrlChanged({
      itemUid: item.uid,
      collectionUid: collection.uid,
      url: value
    }));
  };

  const runQuery = async () => {
    // todo
  };

  const sendNetworkRequest =  async () => {
    dispatch(sendRequest(item, collection.uid));
  };

  return (
    <StyledWrapper className="flex flex-col flex-grow">
      <div
        className="pb-4 px-4"
        style={{
          borderBottom: 'solid 1px var(--color-layout-border)'
        }}
      >
        <div className="pt-1 text-gray-600">{item.name}</div>
        <QueryUrl
          value = {item.request.url}
          onChange={onUrlChange}
          handleRun={sendNetworkRequest}
          collections={collections}
        />
      </div>
      <section className="main flex flex-grow">
        <section className="request-pane">
          <div
            className="px-4"
            style={{width: `${leftPaneWidth}px`, height: 'calc(100% - 5px)'}}
          >
            {item.type === 'graphql-request' ? (
              <GraphQLRequestPane
                onRunQuery={runQuery}
                schema={schema}
                leftPaneWidth={leftPaneWidth}
                value={item.request.body.graphql.query}
                onQueryChange={onGraphqlQueryChange}
              />
            ) : null}

            {item.type === 'http-request' ? (
              <HttpRequestPane
                leftPaneWidth={leftPaneWidth}
              />
            ) : null}
          </div>
        </section>

        <div className="drag-request" onMouseDown={handleDragbarMouseDown}>
        </div>

        <section className="response-pane flex-grow">
          <ResponsePane
            rightPaneWidth={rightPaneWidth}
            response={item.response}
            isLoading={item.response && item.response.state === 'sending' ? true : false}
          />
        </section>
      </section>
    </StyledWrapper>
  )
};

export default RequestTabPanel;
