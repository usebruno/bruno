import React, { useState, useEffect } from 'react';
import find from 'lodash/find';
import QueryUrl from '../QueryUrl';
import RequestPane from '../RequestPane';
import ResponsePane from '../ResponsePane';
import Welcome from '../Welcome';
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
  let [url, setUrl] = useState('https://api.spacex.land/graphql');
  let {
    schema 
  } = useGraphqlSchema('https://api.spacex.land/graphql');
  let [query, setQuery] = useState('');
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
      <Welcome dispatch={dispatch} actions={actions}/>
    );
  }

  const focusedTab = find(requestTabs, (rt) => rt.id === activeRequestTabId);

  if(!focusedTab || !focusedTab.id) {
    return (
      <div className="pb-4 px-4">An error occured!</div>
    );
  }

  let collection;
  let item;

  if(focusedTab.collectionId) {
    collection = find(collections, (c) => c.id === focusedTab.collectionId);
    let flattenedItems = flattenItems(collection.items);
    item = findItem(flattenedItems, activeRequestTabId);
  } else {
    item = focusedTab;
  }

  const runQuery = async () => {
    dispatch({
      type: actions.SEND_REQUEST,
      requestTab: focusedTab,
      collectionId: collection ? collection.id : null
    });
  };

  return (
    <StyledWrapper className="flex flex-col flex-grow">
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
          collections={collections}
        />
      </div>
      <section className="main flex flex-grow">
        <section className="request-pane px-4">
          <div style={{width: `${leftPaneWidth}px`, height: 'calc(100% - 5px)'}}>
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
            isLoading={item.response && item.response.state === 'sending' ? true : false}
          />
        </section>
      </section>
    </StyledWrapper>
  )
};

export default RequestTabPanel;
