import React, { useMemo } from 'react';
import find from 'lodash/find';
import classnames from 'classnames';
import { useSelector, useDispatch } from 'react-redux';
import { updateRequestPaneTab } from 'providers/ReduxStore/slices/tabs';
import QueryParams from 'components/RequestPane/QueryParams';
import RequestHeaders from 'components/RequestPane/RequestHeaders';
import RequestBody from 'components/RequestPane/RequestBody';
import RequestBodyMode from 'components/RequestPane/RequestBody/RequestBodyMode';
import Auth from 'components/RequestPane/Auth';
import AuthMode from 'components/RequestPane/Auth/AuthMode';
import Vars from 'components/RequestPane/Vars';
import Assertions from 'components/RequestPane/Assertions';
import Script from 'components/RequestPane/Script';
import Tests from 'components/RequestPane/Tests';
import StyledWrapper from './StyledWrapper';
import { get } from 'lodash';
import Documentation from 'components/Documentation/index';

const componentMap = (item, collection) => ({
  params: <QueryParams item={item} collection={collection} />,
  body: <RequestBody item={item} collection={collection} />,
  headers: <RequestHeaders item={item} collection={collection} />,
  auth: <Auth item={item} collection={collection} />,
  vars: <Vars item={item} collection={collection} />,
  assert: <Assertions item={item} collection={collection} />,
  script: <Script item={item} collection={collection} />,
  tests: <Tests item={item} collection={collection} />,
  docs: <Documentation item={item} collection={collection} />
});

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

  if (!activeTabUid) {
    return <div>Something went wrong</div>;
  }

  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  if (!focusedTab || !focusedTab.uid || !focusedTab.requestPaneTab) {
    return <div className="pb-4 px-4">An error occurred!</div>;
  }
  const tabPanel = useMemo(() => {
    const getTabPanel = (tab, item, collection) => {
      const components = componentMap(item, collection);
      return components[tab] || <div className="mt-4">404 | Not found</div>;
    };

    return getTabPanel(focusedTab.requestPaneTab, item, collection);
  }, [focusedTab.requestPaneTab, item, collection]);

  const getTabClassname = (tabName) => {
    return classnames(`tab select-none ${tabName}`, {
      active: tabName === focusedTab.requestPaneTab
    });
  };

  // get the length of active params, headers, asserts and vars
  const params = item.draft ? get(item, 'draft.request.params', []) : get(item, 'request.params', []);
  const headers = item.draft ? get(item, 'draft.request.headers', []) : get(item, 'request.headers', []);
  const assertions = item.draft ? get(item, 'draft.request.assertions', []) : get(item, 'request.assertions', []);
  const requestVars = item.draft ? get(item, 'draft.request.vars.req', []) : get(item, 'request.vars.req', []);
  const responseVars = item.draft ? get(item, 'draft.request.vars.res', []) : get(item, 'request.vars.res', []);

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
          Query
          {activeParamsLength > 0 && <sup className="ml-1 font-medium">{activeParamsLength}</sup>}
        </div>
        <div className={getTabClassname('body')} role="tab" onClick={() => selectTab('body')}>
          Body
        </div>
        <div className={getTabClassname('headers')} role="tab" onClick={() => selectTab('headers')}>
          Headers
          {activeHeadersLength > 0 && <sup className="ml-1 font-medium">{activeHeadersLength}</sup>}
        </div>
        <div className={getTabClassname('auth')} role="tab" onClick={() => selectTab('auth')}>
          Auth
        </div>
        <div className={getTabClassname('vars')} role="tab" onClick={() => selectTab('vars')}>
          Vars
          {activeVarsLength > 0 && <sup className="ml-1 font-medium">{activeVarsLength}</sup>}
        </div>
        <div className={getTabClassname('script')} role="tab" onClick={() => selectTab('script')}>
          Script
        </div>
        <div className={getTabClassname('assert')} role="tab" onClick={() => selectTab('assert')}>
          Assert
          {activeAssertionsLength > 0 && <sup className="ml-1 font-medium">{activeAssertionsLength}</sup>}
        </div>
        <div className={getTabClassname('tests')} role="tab" onClick={() => selectTab('tests')}>
          Tests
        </div>
        <div className={getTabClassname('docs')} role="tab" onClick={() => selectTab('docs')}>
          Docs
        </div>
        {focusedTab.requestPaneTab === 'body' ? (
          <div className="flex flex-grow justify-end items-center">
            <RequestBodyMode item={item} collection={collection} />
          </div>
        ) : null}
      </div>
      <section
        className={`flex w-full flex-grow ${
          ['script', 'vars', 'auth', 'docs'].includes(focusedTab.requestPaneTab) ? '' : 'mt-5'
        }`}
      >
        {tabPanel}
      </section>
    </StyledWrapper>
  );
};

export default HttpRequestPane;
