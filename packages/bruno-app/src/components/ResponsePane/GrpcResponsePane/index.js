import React, { useRef } from 'react';
import find from 'lodash/find';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { updateResponsePaneTab } from 'providers/ReduxStore/slices/tabs';
import Overlay from '../Overlay';
import Placeholder from '../Placeholder';
import HeightBoundContainer from 'ui/HeightBoundContainer';
import GrpcResponseHeaders from './GrpcResponseHeaders';
import GrpcStatusCode from './GrpcStatusCode';
import ResponseTime from '../ResponseTime/index';
import Timeline from '../Timeline';
import ClearTimeline from '../ClearTimeline';
import ResponseClear from '../ResponseClear';
import StyledWrapper from './StyledWrapper';
import ResponseTrailers from './ResponseTrailers';
import GrpcQueryResult from './GrpcQueryResult';
import ResponseLayoutToggle from '../ResponseLayoutToggle';
import ResponsiveTabs from 'ui/ResponsiveTabs';

const GrpcResponsePane = ({ item, collection }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const isLoading = ['queued', 'sending'].includes(item.requestState);
  const rightContentRef = useRef(null);

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

  const metadataCount = Array.isArray(response.metadata) ? response.metadata.length : 0;
  const trailersCount = Array.isArray(response.trailers) ? response.trailers.length : 0;
  const responsesCount = Array.isArray(response.responses) ? response.responses.length : 0;

  const allTabs = [
    {
      key: 'response',
      label: t('GRPC_RESPONSE.RESPONSE'),
      indicator:
        responsesCount > 0 ? (
          <sup data-testid="grpc-tab-response-count" className="ml-1 font-medium">
            {responsesCount}
          </sup>
        ) : null
    },
    {
      key: 'headers',
      label: t('GRPC_RESPONSE.METADATA'),
      indicator: metadataCount > 0 ? <sup className="ml-1 font-medium">{metadataCount}</sup> : null
    },
    {
      key: 'trailers',
      label: t('GRPC_RESPONSE.TRAILERS'),
      indicator: trailersCount > 0 ? <sup className="ml-1 font-medium">{trailersCount}</sup> : null
    },
    {
      key: 'timeline',
      label: t('GRPC_RESPONSE.TIMELINE'),
      indicator: null
    }
  ];

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
        return <Timeline collection={collection} item={item} activeTabUid={activeTabUid} />;
      }
      default: {
        return <div>{t('GRPC_RESPONSE.NOT_FOUND')}</div>;
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
      <HeightBoundContainer>
        <Placeholder />
      </HeightBoundContainer>
    );
  }

  if (!activeTabUid) {
    return <div>{t('GRPC_RESPONSE.SOMETHING_WRONG')}</div>;
  }

  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  if (!focusedTab || !focusedTab.uid || !focusedTab.responsePaneTab) {
    return <div className="pb-4 px-4">{t('GRPC_RESPONSE.ERROR_OCCURRED')}</div>;
  }

  const rightContent = !isLoading ? (
    <div ref={rightContentRef} className="flex items-center">
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
  ) : null;

  return (
    <StyledWrapper className="flex flex-col h-full relative">
      <div className="px-4">
        <ResponsiveTabs
          tabs={allTabs}
          activeTab={focusedTab.responsePaneTab}
          onTabSelect={selectTab}
          rightContent={rightContent}
          rightContentRef={rightContentRef}
        />
      </div>
      <section className="response-pane-content">
        {isLoading ? <Overlay item={item} collection={collection} /> : null}
        <div className="response-tab-content">
          {!item?.response ? (
            focusedTab?.responsePaneTab === 'timeline' && requestTimeline?.length ? (
              <Timeline collection={collection} item={item} activeTabUid={activeTabUid} />
            ) : null
          ) : (
            <>{getTabPanel(focusedTab.responsePaneTab)}</>
          )}
        </div>
      </section>
    </StyledWrapper>
  );
};

export default GrpcResponsePane;
