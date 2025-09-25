import React from 'react';
import find from 'lodash/find';
import { useDispatch, useSelector } from 'react-redux';
import { updateResponsePaneTab } from 'providers/ReduxStore/slices/tabs';
import Overlay from '../Overlay';
import Placeholder from '../Placeholder';
import WSStatusCode from './WSStatusCode';
import ResponseTime from '../ResponseTime/index';
import Timeline from '../Timeline';
import ClearTimeline from '../ClearTimeline';
import ResponseClear from '../ResponseClear';
import StyledWrapper from './StyledWrapper';
import ResponseLayoutToggle from '../ResponseLayoutToggle';
import Tab from 'components/Tab';
import WSMessagesList from './WSMessagesList';
import WSResponseSortOrder from './WSResponseSortOrder';
import WSResponseHeaders from './WSResponseHeaders';

const WSResult = ({ response }) => {
  return response.isError ? (
    <div className="text-red-500" style={{ whiteSpace: 'pre-line' }}>
      {response.error}
    </div>
  ) : (
    <WSMessagesList order={response?.sortOrder} messages={response.responses || []} />
  );
};

const WSResponsePane = ({ item, collection }) => {
  const dispatch = useDispatch();
  const tabs = useSelector(state => state.tabs.tabs);
  const activeTabUid = useSelector(state => state.tabs.activeTabUid);
  const isLoading = ['queued', 'sending'].includes(item.requestState);

  const requestTimeline = [...(collection?.timeline || [])].filter(obj => {
    if (obj.itemUid === item.uid) return true;
  });

  const selectTab = tab => {
    dispatch(updateResponsePaneTab({
      uid: item.uid,
      responsePaneTab: tab,
    }));
  };

  const response = item.response || {};

  const getTabPanel = tab => {
    switch (tab) {
      case 'response': {
        return <WSResult response={response} />;
      }
      case 'headers': {
        return <WSResponseHeaders response={response} />;
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

  const focusedTab = find(tabs, t => t.uid === activeTabUid);
  if (!focusedTab || !focusedTab.uid || !focusedTab.responsePaneTab) {
    return <div className="pb-4 px-4">An error occurred!</div>;
  }

  const tabConfig = [
    {
      name: 'response',
      label: 'Messages',
      count: Array.isArray(response.responses) ? response.responses.length : 0,
    },
    {
      name: 'headers',
      label: 'Headers',
      count: response.headers ? Object.keys(response.headers).length : 0,
    },
    {
      name: 'timeline',
      label: 'Timeline',
    },
  ];

  return (
    <StyledWrapper className="flex flex-col h-full relative">
      <div className="flex flex-wrap items-center pl-3 pr-4 tabs" role="tablist">
        {tabConfig.map(tab => (
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
                <WSResponseSortOrder item={item} collection={collection} />
                <WSStatusCode
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

export default WSResponsePane;
