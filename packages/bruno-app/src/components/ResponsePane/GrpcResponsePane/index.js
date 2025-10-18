import React, { useState, useEffect } from 'react';
import find from 'lodash/find';
import classnames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { updateResponsePaneTab } from 'providers/ReduxStore/slices/tabs';
import Overlay from '../Overlay';
import Placeholder from '../Placeholder';
import GrpcResponseHeaders from './GrpcResponseHeaders';
import GrpcStatusCode from './GrpcStatusCode';
import ResponseTime from '../ResponseTime/index';
import Timeline from '../Timeline';
import ClearTimeline from '../ClearTimeline';
import ResponseSave from '../ResponseSave';
import ResponseClear from '../ResponseClear';
import StyledWrapper from './StyledWrapper';
import ResponseTrailers from './ResponseTrailers';
import GrpcQueryResult from './GrpcQueryResult';
import ResponseLayoutToggle from '../ResponseLayoutToggle';
import Tab from 'components/Tab';

const GrpcResponsePane = ({ item, collection }) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const isLoading = ['queued', 'sending'].includes(item.requestState);

  const requestTimeline = [...(collection?.timeline || [])].filter((obj) => {
    if (obj.itemUid === item.uid) return true;
  });

  const selectTab = (tab) => {
    dispatch(
      updateResponsePaneTab({
        uid: item.uid,
        responsePaneTab: tab
      })
    );
  };

  const response = item.response || {};

  const getTabPanel = (tab) => {
    switch (tab) {
      case 'response': {
        return <GrpcQueryResult item={item} collection={collection} />;
      }
      case 'headers': {
        return <GrpcResponseHeaders metadata={response.metadata} />;
      }
      case 'trailers': {
        return <ResponseTrailers trailers={response.trailers} />;
      }
      case 'timeline': {
        return <Timeline collection={collection} item={item} />;
      }
      default: {
        return <div>404 | Not found</div>;
      }
    }
  };

  if (isLoading && !item.response) {
    return (
      <StyledWrapper className="flex flex-col h-full relative">
        <Overlay item={item} collection={collection} />
      </StyledWrapper>
    );
  }

  if (!item.response && !requestTimeline?.length) {
    return (
      <StyledWrapper className="flex h-full relative">
        <Placeholder />
      </StyledWrapper>
    );
  }

  if (!activeTabUid) {
    return <div>Something went wrong</div>;
  }

  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  if (!focusedTab || !focusedTab.uid || !focusedTab.responsePaneTab) {
    return <div className="pb-4 px-4">An error occurred!</div>;
  }

  const tabConfig = [
    {
      name: 'response',
      label: 'Response',
      count: Array.isArray(response.responses) ? response.responses.length : 0
    },
    {
      name: 'headers',
      label: 'Metadata',
      count: Array.isArray(response.metadata) ? response.metadata.length : 0
    },
    {
      name: 'trailers',
      label: 'Trailers',
      count: Array.isArray(response.trailers) ? response.trailers.length : 0
    },
    {
      name: 'timeline',
      label: 'Timeline'
    }
  ];

  return (
    <StyledWrapper className="flex flex-col h-full relative">
      <div className="flex flex-wrap items-center pl-3 pr-4 tabs" role="tablist">
        {tabConfig.map((tab) => (
          <Tab
            key={tab.name}
            name={tab.name}
            label={tab.label}
            isActive={focusedTab.responsePaneTab === tab.name}
            onClick={selectTab}
            count={tab.count}
          />
        ))}
        {!isLoading ? (
          <div className="flex flex-grow justify-end items-center">
            {focusedTab?.responsePaneTab === 'timeline' ? (
              <>
                <ResponseLayoutToggle />
                <ClearTimeline item={item} collection={collection} />
              </>
            ) : item?.response ? (
              <>
                <ResponseLayoutToggle />
                <ResponseClear item={item} collection={collection} />
                <GrpcStatusCode
                  status={response.statusCode}
                  text={response.statusText}
                  details={response.statusDescription}
                />
                <ResponseTime duration={response.duration} />
              </>
            ) : null}
          </div>
        ) : null}
      </div>
      <section
        className={`flex flex-col flex-grow pl-3 pr-4 h-0 ${focusedTab.responsePaneTab === 'response' ? '' : 'mt-4'}`}
      >
        {isLoading ? <Overlay item={item} collection={collection} /> : null}
        {!item?.response ? (
          focusedTab?.responsePaneTab === 'timeline' && requestTimeline?.length ? (
            <Timeline collection={collection} item={item} />
          ) : null
        ) : (
          <>{getTabPanel(focusedTab.responsePaneTab)}</>
        )}
      </section>
    </StyledWrapper>
  );
};

export default GrpcResponsePane;
