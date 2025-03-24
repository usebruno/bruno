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

const GrpcResponsePane = ({ rightPaneWidth, item, collection }) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const isLoading = ['queued', 'sending'].includes(item.requestState);

  const requestTimeline = ([...(collection?.timeline || [])]).filter(obj => {
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

  console.log('response.headers', response.headers);
  console.log('response.trailers', response.trailers);
  console.log('response', response);
  const getTabPanel = (tab) => {
    switch (tab) {
      case 'response': {
        return (
          <GrpcQueryResult
            item={item}
            collection={collection}
            width={rightPaneWidth}
          />
        );
      }
      case 'headers': {
        return <GrpcResponseHeaders headers={response.headers} />;
      }
      case 'trailers': {
        return <ResponseTrailers trailers={response.trailers} />;
      }
      case 'timeline': {
        return <Timeline collection={collection} item={item} width={rightPaneWidth} />;
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

  const getTabClassname = (tabName) => {
    return classnames(`tab select-none ${tabName}`, {
      active: tabName === focusedTab.responsePaneTab
    });
  };

  const responseHeadersCount = Array.isArray(response.headers) ? response.headers.length : 0;
  const responseTrailersCount = Array.isArray(response.trailers) ? response.trailers.length : 0;
  const responseMessagesCount = Array.isArray(response.responses) ? response.responses.length : 0;


  return (
    <StyledWrapper className="flex flex-col relative">
      <div className="flex flex-wrap items-center pl-3 pr-4 tabs" role="tablist">
        <div className={getTabClassname('response')} role="tab" onClick={() => selectTab('response')}>
          Response
          {responseMessagesCount > 0 && <sup className="ml-1 font-medium">{responseMessagesCount}</sup>}
        </div>
        <div className={getTabClassname('headers')} role="tab" onClick={() => selectTab('headers')}>
          Metadata
          {responseHeadersCount > 0 && <sup className="ml-1 font-medium">{responseHeadersCount}</sup>}
        </div>
        <div className={getTabClassname('trailers')} role="tab" onClick={() => selectTab('trailers')}>
          Trailers
          {responseTrailersCount > 0 && <sup className="ml-1 font-medium">{responseTrailersCount}</sup>}
        </div>
        <div className={getTabClassname('timeline')} role="tab" onClick={() => selectTab('timeline')}>
          Timeline
        </div>
        {!isLoading ? (
          <div className="flex flex-grow justify-end items-center">
            {focusedTab?.responsePaneTab === "timeline" ? (
              <ClearTimeline item={item} collection={collection} />
            ) : item?.response ? (
              <>
                <ResponseClear item={item} collection={collection} />
                <ResponseSave item={item} />
                <GrpcStatusCode status={response.statusCode} text={response.statusText} details={response.statusDescription} />
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
          focusedTab?.responsePaneTab === "timeline" && requestTimeline?.length ? (
            <Timeline
              collection={collection}
              item={item}
              width={rightPaneWidth}
            />
          ) : null
        ) : (
          <>{getTabPanel(focusedTab.responsePaneTab)}</>
        )}
      </section>
    </StyledWrapper>
  );
};

export default GrpcResponsePane;
