import React from 'react';
import classnames from 'classnames';
import { useSelector, useDispatch } from 'react-redux';
import { updateRequestPaneTab } from 'providers/ReduxStore/slices/tabs';
import RequestHeaders from 'components/RequestPane/RequestHeaders';
import GrpcBody from 'components/GrpcBody/index';
import GrpcAuth from './GrpcAuth/index';
import DotIcon from 'components/Icons/Dot';
import StyledWrapper from './StyledWrapper';
import { find, get } from 'lodash';
import Documentation from 'components/Documentation/index';
import { useEffect } from 'react';

const ContentIndicator = () => {
  return (
    <sup className="ml-[.125rem] opacity-80 font-medium">
      <DotIcon width="10"></DotIcon>
    </sup>
  );
};

const GrpcRequestPane = ({ item, collection, leftPaneWidth }) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);

  const selectTab = (tab) => {
    dispatch(
      updateRequestPaneTab({
        uid: item.uid,
        requestPaneTab: tab
      })
    );
  };

  const getTabPanel = (tab) => {
    switch (tab) {
      case 'body': {
        return <GrpcBody item={item} collection={collection} hideModeSelector={true} hidePrettifyButton={true} />;
      }
      case 'headers': {
        return <RequestHeaders item={item} collection={collection} addHeaderText="Add Metadata" />;
      }
      case 'auth': {
        return <GrpcAuth item={item} collection={collection} />;
      }
      case 'docs': {
        return <Documentation item={item} collection={collection} />;
      }
      default: {
        return <div className="mt-4">404 | Not found</div>;
      }
    }
  };

  if (!activeTabUid) {
    return <div>Something went wrong</div>;
  }

  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  if (!focusedTab || !focusedTab.uid || !focusedTab.requestPaneTab) {
    return <div className="pb-4 px-4">An error occurred!</div>;
  }

  const getTabClassname = (tabName) => {
    return classnames(`tab select-none ${tabName}`, {
      active: tabName === focusedTab.requestPaneTab
    });
  };

  const isMultipleContentTab = ['script', 'vars', 'auth', 'docs'].includes(focusedTab.requestPaneTab);

  // get the length of active params, headers, asserts and vars as well as the contents of the body, tests and script
  const getPropertyFromDraftOrRequest = (propertyKey) =>
    item.draft ? get(item, `draft.${propertyKey}`, []) : get(item, propertyKey, []);
  const body = getPropertyFromDraftOrRequest('request.body');
  const headers = getPropertyFromDraftOrRequest('request.headers');
  const docs = getPropertyFromDraftOrRequest('request.docs');
  const auth = getPropertyFromDraftOrRequest('request.auth');

  const activeHeadersLength = headers.filter((header) => header.enabled).length;

  useEffect(() => {
      selectTab('body');
  }, []);

  return (
    <StyledWrapper className="flex flex-col h-full relative">
      <div className="flex flex-wrap items-center tabs" role="tablist">
        <div className={getTabClassname('body')} role="tab" onClick={() => selectTab('body')}>
          Message
          {body.mode !== 'none' && <ContentIndicator />}
        </div>
        <div className={getTabClassname('headers')} role="tab" onClick={() => selectTab('headers')}>
          Metadata
          {activeHeadersLength > 0 && <sup className="ml-[.125rem] font-medium">{activeHeadersLength}</sup>}
        </div>
        <div className={getTabClassname('auth')} role="tab" onClick={() => selectTab('auth')}>
          Auth
          {auth.mode !== 'none' && <ContentIndicator />}
        </div>
        <div className={getTabClassname('docs')} role="tab" onClick={() => selectTab('docs')}>
          Docs
          {docs && docs.length > 0 && <ContentIndicator />}
        </div>
      </div>
      <section
        className={classnames('flex w-full flex-1 h-full', {
          'mt-5': !isMultipleContentTab
        })}
      >
        {getTabPanel(focusedTab.requestPaneTab)}
      </section>
    </StyledWrapper>
  );
};

export default GrpcRequestPane;
