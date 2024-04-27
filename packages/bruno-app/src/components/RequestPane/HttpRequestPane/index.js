import classnames from 'classnames';
import Documentation from 'components/Documentation/index';
import Assertions from 'components/RequestPane/Assertions';
import Auth from 'components/RequestPane/Auth';
import QueryParams from 'components/RequestPane/QueryParams';
import RequestBody from 'components/RequestPane/RequestBody';
import RequestBodyMode from 'components/RequestPane/RequestBody/RequestBodyMode';
import RequestHeaders from 'components/RequestPane/RequestHeaders';
import Script from 'components/RequestPane/Script';
import Tests from 'components/RequestPane/Tests';
import Vars from 'components/RequestPane/Vars';
import { find, get, omit } from 'lodash';
import { updateRequestPaneTab } from 'providers/ReduxStore/slices/tabs';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { hasNonEmptyValue } from 'src/utils/common';
import StyledWrapper from './StyledWrapper';

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

  const getTabClassname = (tabName, hasContent) => {
    return classnames(`tab select-none ${tabName}`, {
      active: tabName === focusedTab.requestPaneTab,
      content: hasContent
    });
  };

  const request = item.draft ? get(item, 'draft.request', {}) : get(item, 'request');
  const activeParamsLength = request.params.filter((param) => param.enabled).length;
  const activeHeadersLength = request.headers.filter((header) => header.enabled).length;
  const activeAssertionsLength = request.assertions.filter((assertion) => assertion.enabled).length;
  const activeVarsLength =
    request.vars.req?.filter((request) => request.enabled).length +
    request.vars.res?.filter((response) => response.enabled).length;

  return (
    <StyledWrapper className="flex flex-col h-full relative">
      <div className="flex flex-wrap items-center tabs" role="tablist">
        <div className={getTabClassname('params', activeParamsLength)} role="tab" onClick={() => selectTab('params')}>
          Query
          {activeParamsLength > 0 && <sup className="ml-1 font-medium">{activeParamsLength}</sup>}
        </div>
        <div className={getTabClassname('body', hasNonEmptyValue(omit(request.body, 'mode')))} role="tab" onClick={() => selectTab('body')}>
          Body
        </div>
        <div className={getTabClassname('headers', request.headers.length)} role="tab" onClick={() => selectTab('headers')}>
          Headers
          {activeHeadersLength > 0 && <sup className="ml-1 font-medium">{activeHeadersLength}</sup>}
        </div>
        <div className={getTabClassname('auth', hasNonEmptyValue(omit(request.auth, 'mode')))} role="tab" onClick={() => selectTab('auth')}>
          Auth
        </div>
        <div className={getTabClassname('vars', request.vars.req?.length ?? 0 + request.vars.res?.length ?? 0)} role="tab" onClick={() => selectTab('vars')}>
          Vars
          {activeVarsLength > 0 && <sup className="ml-1 font-medium">{activeVarsLength}</sup>}
        </div>
        <div className={getTabClassname('script', request.script.req || request.script.res)} role="tab" onClick={() => selectTab('script')}>
          Script
        </div>
        <div className={getTabClassname('assert', request.assertions.length)} role="tab" onClick={() => selectTab('assert')}>
          Assert
          {activeAssertionsLength > 0 && <sup className="ml-1 font-medium">{activeAssertionsLength}</sup>}
        </div>
        <div className={getTabClassname('tests', request.tests.length)} role="tab" onClick={() => selectTab('tests')}>
          Tests
        </div>
        <div className={getTabClassname('docs', request.docs.length)} role="tab" onClick={() => selectTab('docs')}>
          Docs
        </div>
        {focusedTab.requestPaneTab === 'body' ? (
          <div className="flex flex-grow justify-end items-center">
            <RequestBodyMode item={item} collection={collection} />
          </div>
        ) : null}
      </div>
      <section
        className={`flex w-full ${
          ['script', 'vars', 'auth', 'docs'].includes(focusedTab.requestPaneTab) ? '' : 'mt-5'
        }`}
      >
        {getTabPanel(focusedTab.requestPaneTab)}
      </section>
    </StyledWrapper>
  );
};

export default HttpRequestPane;
