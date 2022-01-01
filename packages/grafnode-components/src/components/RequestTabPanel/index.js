import React, { useState, useEffect } from 'react';
import find from 'lodash/find';
import { rawRequest, gql } from 'graphql-request';
import QueryUrl from '../QueryUrl';
import RequestPane from '../RequestPane';
import ResponsePane from '../ResponsePane';
import {
  flattenItems,
  findItem
} from '../../utils';
import useGraphqlSchema from '../../hooks/useGraphqlSchema';

import StyledWrapper from './StyledWrapper';

const RequestTabPanel = ({dispatch, actions, collections, activeRequestTabId, requestTabs}) => {
  if(typeof window == 'undefined') {
    return <div></div>;
  }

  let asideWidth = 200;
  let [data, setData] = useState({});
  let [url, setUrl] = useState('https://api.spacex.land/graphql');
  let {
    schema 
  } = useGraphqlSchema('https://api.spacex.land/graphql');
  let [query, setQuery] = useState('');
  let [isLoading, setIsLoading] = useState(false);
  const [leftPaneWidth, setLeftPaneWidth] = useState(500);
  const [rightPaneWidth, setRightPaneWidth] = useState(window.innerWidth - 700 - asideWidth);
  const [dragging, setDragging] = useState(false);
  const handleMouseMove = (e) => {
    e.preventDefault();
    if(dragging) {
      setLeftPaneWidth(e.clientX - asideWidth );
      setRightPaneWidth(window.innerWidth - (e.clientX));
    }
  };
  const handleMouseUp = (e) => {
    e.preventDefault();
    setDragging(false);
  };
  const handleMouseDown = (e) => {
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

  const onUrlChange = (value) => setUrl(value);
  const onQueryChange = (value) => setQuery(value);

  if(!activeRequestTabId) {
    return (
      <div className="pb-4 px-4">No request selected</div>
    );
  }

  const focusedTab = find(requestTabs, (rt) => rt.id === activeRequestTabId);

  if(!focusedTab || !focusedTab.id) {
    return (
      <div className="pb-4 px-4">An error occured!</div>
    );
  }

  const collection = find(collections, (c) => c.id === focusedTab.collectionId);
  const flattenedItems = flattenItems(collection.items);
  const item = findItem(flattenedItems, activeRequestTabId);

  const runQuery = async () => {
    const query = gql`${item.request.body.graphql.query}`;

    setIsLoading(true);
    const timeStart = Date.now();
    const { data, errors, extensions, headers, status } = await rawRequest(item.request.url, query);
    const timeEnd = Date.now();
    setData(data);
    setIsLoading(false);
    console.log(headers);

    if(data && !errors) {
      dispatch({
        type: actions.RESPONSE_RECEIVED,
        response: {
          data: data,
          headers: Object.entries(headers.map),
          status: status,
          duration: timeEnd - timeStart
        },
        requestTab: focusedTab,
        collectionId: collection.id
      });
    }
  };

  return (
    <StyledWrapper>
      <div
        className="pb-4 px-4"
        style={{
          borderBottom: 'solid 1px #e1e1e1'
        }}
      >
        <div className="pt-2 text-gray-600">{item.name}</div>
        <QueryUrl
          value = {url}
          onChange={onUrlChange}
          handleRun={runQuery}
        />
      </div>
      <section className="main">
        <section className="request-pane px-4">
          <div style={{width: `${leftPaneWidth}px`}}>
            <RequestPane
              onRunQuery={runQuery}
              schema={schema}
              leftPaneWidth={leftPaneWidth}
              value={item.request.body.graphql.query}
              onQueryChange={onQueryChange}
            />
          </div>
        </section>

        <div className="drag-request" onMouseDown={handleMouseDown}>
        </div>

        <section className="response-pane px-4 flex-grow">
          <ResponsePane
            rightPaneWidth={rightPaneWidth}
            response={item.response}
            isLoading={isLoading}
          />
        </section>
      </section>
    </StyledWrapper>
  )
};

export default RequestTabPanel;
