import React from 'react';
import classnames from 'classnames';
import { useSelector, useDispatch } from 'react-redux';
import { updateRequestPaneTab } from 'providers/ReduxStore/slices/tabs';
import QueryParams from 'components/RequestPane/QueryParams';
import RequestHeaders from 'components/RequestPane/RequestHeaders';
import RequestBody from 'components/RequestPane/RequestBody';
import RequestBodyMode from 'components/RequestPane/RequestBody/RequestBodyMode';
import Auth from 'components/RequestPane/Auth';
import DotIcon from 'components/Icons/Dot';
import Vars from 'components/RequestPane/Vars';
import Assertions from 'components/RequestPane/Assertions';
import Script from 'components/RequestPane/Script';
import Tests from 'components/RequestPane/Tests';
import StyledWrapper from './StyledWrapper';
import { find, get } from 'lodash';
import Documentation from 'components/Documentation/index';

const ContentIndicator = () => {
  return (
    <sup className="ml-[.125rem] opacity-80 font-medium">
      <DotIcon width="10"></DotIcon>
    </sup>
  );
};

const HttpRequestPane = ({ item, collection, leftPaneWidth }) => {
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
      case 'params': {
        return <QueryParams item={item} collection={collection} />;
      }
      case 'body': {
        return <RequestBody item={item} collection={collection} />;
      }
      case 'headers': {
        return <RequestHeaders item={item} collection={collection} />;
      }
      case 'auth': {
        return <Auth item={item} collection={collection} />;
      }
      case 'vars': {
        return <Vars item={item} collection={collection} />;
      }
      case 'assert': {
        return <Assertions item={item} collection={collection} />;
      }
      case 'script': {
        return <Script item={item} collection={collection} />;
      }
      case 'tests': {
        return <Tests item={item} collection={collection} />;
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

  const isMultipleContentTab = ['params', 'script', 'vars', 'auth', 'docs'].includes(focusedTab.requestPaneTab);

  // get the length of active params, headers, asserts and vars as well as the contents of the body, tests and script
  const getPropertyFromDraftOrRequest = (propertyKey) =>
    item.draft ? get(item, `draft.${propertyKey}`, []) : get(item, propertyKey, []);
  const params = getPropertyFromDraftOrRequest('request.params');
  const body = getPropertyFromDraftOrRequest('request.body');
  const headers = getPropertyFromDraftOrRequest('request.headers');
  const script = getPropertyFromDraftOrRequest('request.script');
  const assertions = getPropertyFromDraftOrRequest('request.assertions');
  const tests = getPropertyFromDraftOrRequest('request.tests');
  const docs = getPropertyFromDraftOrRequest('request.docs');
  const requestVars = getPropertyFromDraftOrRequest('request.vars.req');
  const responseVars = getPropertyFromDraftOrRequest('request.vars.res');
  const auth = getPropertyFromDraftOrRequest('request.auth');

  const activeParamsLength = params.filter((param) => param.enabled).length;
  const activeHeadersLength = headers.filter((header) => header.enabled).length;
  const activeAssertionsLength = assertions.filter((assertion) => assertion.enabled).length;
  const activeVarsLength =
    requestVars.filter((request) => request.enabled).length +
    responseVars.filter((response) => response.enabled).length;

  return (
    <StyledWrapper className="flex flex-col h-full relative">
      <div className="flex flex-wrap items-center tabs" role="tablist">
        <div className={getTabClassname('params')} role="tab" onClick={() => selectTab('params')}>
          Params
          {activeParamsLength > 0 && <sup className="ml-1 font-medium">{activeParamsLength}</sup>}
        </div>
        <div className={getTabClassname('body')} role="tab" onClick={() => selectTab('body')}>
          Body
          {body.mode !== 'none' && <ContentIndicator />}
        </div>
        <div className={getTabClassname('headers')} role="tab" onClick={() => selectTab('headers')}>
          Headers
          {activeHeadersLength > 0 && <sup className="ml-[.125rem] font-medium">{activeHeadersLength}</sup>}
        </div>
        <div className={getTabClassname('auth')} role="tab" onClick={() => selectTab('auth')}>
          Auth
          {auth.mode !== 'none' && <ContentIndicator />}
        </div>
        <div className={getTabClassname('vars')} role="tab" onClick={() => selectTab('vars')}>
          Vars
          {activeVarsLength > 0 && <sup className="ml-1 font-medium">{activeVarsLength}</sup>}
        </div>
        <div className={getTabClassname('script')} role="tab" onClick={() => selectTab('script')}>
          Script
          {(script.req || script.res) && <ContentIndicator />}
        </div>
        <div className={getTabClassname('assert')} role="tab" onClick={() => selectTab('assert')}>
          Assert
          {activeAssertionsLength > 0 && <sup className="ml-1 font-medium">{activeAssertionsLength}</sup>}
        </div>
        <div className={getTabClassname('tests')} role="tab" onClick={() => selectTab('tests')}>
          Tests
          {tests && tests.length > 0 && <ContentIndicator />}
        </div>
        <div className={getTabClassname('docs')} role="tab" onClick={() => selectTab('docs')}>
          Docs
          {docs && docs.length > 0 && <ContentIndicator />}
        </div>
        {focusedTab.requestPaneTab === 'body' ? (
          <div className="flex flex-grow justify-end items-center">
            <RequestBodyMode item={item} collection={collection} />
          </div>
        ) : null}
      </div>
      <section
        className={classnames('flex w-full flex-1', {
          'mt-5': !isMultipleContentTab
        })}
      >
        {getTabPanel(focusedTab.requestPaneTab)}
      </section>
    </StyledWrapper>
  );
};

export default HttpRequestPane;
