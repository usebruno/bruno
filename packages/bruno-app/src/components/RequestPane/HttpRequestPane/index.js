import React, { useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import classnames from 'classnames';
import { useSelector, useDispatch } from 'react-redux';
import { find, get } from 'lodash';
import { updateRequestPaneTab } from 'providers/ReduxStore/slices/tabs';
import QueryParams from 'components/RequestPane/QueryParams';
import RequestHeaders from 'components/RequestPane/RequestHeaders';
import RequestBody from 'components/RequestPane/RequestBody';
import RequestBodyMode from 'components/RequestPane/RequestBody/RequestBodyMode';
import Auth from 'components/RequestPane/Auth';
import Vars from 'components/RequestPane/Vars';
import Assertions from 'components/RequestPane/Assertions';
import Script from 'components/RequestPane/Script';
import Tests from 'components/RequestPane/Tests';
import Settings from 'components/RequestPane/Settings';
import Documentation from 'components/Documentation/index';
import StatusDot from 'components/StatusDot';
import ResponsiveTabs from 'ui/ResponsiveTabs';
import HeightBoundContainer from 'ui/HeightBoundContainer';
import AuthMode from '../Auth/AuthMode/index';

const TAB_PANELS = {
  params: QueryParams,
  body: RequestBody,
  headers: RequestHeaders,
  auth: Auth,
  vars: Vars,
  assert: Assertions,
  script: Script,
  tests: Tests,
  docs: Documentation,
  settings: Settings
};

const HttpRequestPane = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);

  const TAB_CONFIG = useMemo(() => [
    { key: 'params', label: t('REQUEST_PANE.PARAMS') },
    { key: 'body', label: t('REQUEST_PANE.BODY') },
    { key: 'headers', label: t('REQUEST_PANE.HEADERS') },
    { key: 'auth', label: t('REQUEST_PANE.AUTH') },
    { key: 'vars', label: t('REQUEST_PANE.VARS') },
    { key: 'script', label: t('REQUEST_PANE.SCRIPT') },
    { key: 'assert', label: t('REQUEST_PANE.ASSERT') },
    { key: 'tests', label: t('REQUEST_PANE.TESTS') },
    { key: 'docs', label: t('REQUEST_PANE.DOCS') },
    { key: 'settings', label: t('REQUEST_PANE.SETTINGS') }
  ], [t]);

  const rightContentRef = useRef(null);

  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const requestPaneTab = focusedTab?.requestPaneTab;

  const getProperty = useCallback(
    (key) => (item.draft ? get(item, `draft.${key}`, []) : get(item, key, [])),
    [item.draft, item]
  );

  const params = getProperty('request.params');
  const body = getProperty('request.body');
  const headers = getProperty('request.headers');
  const script = getProperty('request.script');
  const assertions = getProperty('request.assertions');
  const tests = getProperty('request.tests');
  const docs = getProperty('request.docs');
  const requestVars = getProperty('request.vars.req');
  const responseVars = getProperty('request.vars.res');
  const auth = getProperty('request.auth');
  const tags = getProperty('tags');

  const activeCounts = useMemo(() => ({
    params: params.filter((p) => p.enabled).length,
    headers: headers.filter((h) => h.enabled).length,
    assertions: assertions.filter((a) => a.enabled).length,
    vars: requestVars.filter((r) => r.enabled).length + responseVars.filter((r) => r.enabled).length
  }), [params, headers, assertions, requestVars, responseVars]);

  const selectTab = useCallback(
    (tabKey) => {
      dispatch(updateRequestPaneTab({ uid: item.uid, requestPaneTab: tabKey }));
    },
    [dispatch, item.uid]
  );

  const indicators = useMemo(() => {
    const hasScriptError = item.preRequestScriptErrorMessage || item.postResponseScriptErrorMessage;
    const hasTestError = item.testScriptErrorMessage;

    return {
      params: activeCounts.params > 0 ? <sup className="font-medium">{activeCounts.params}</sup> : null,
      body: body.mode !== 'none' ? <StatusDot /> : null,
      headers: activeCounts.headers > 0 ? <sup className="font-medium">{activeCounts.headers}</sup> : null,
      auth: auth.mode !== 'none' ? <StatusDot /> : null,
      vars: activeCounts.vars > 0 ? <sup className="font-medium">{activeCounts.vars}</sup> : null,
      script: (script.req || script.res) ? (hasScriptError ? <StatusDot type="error" /> : <StatusDot />) : null,
      assert: activeCounts.assertions > 0 ? <sup className="font-medium">{activeCounts.assertions}</sup> : null,
      tests: tests?.length > 0 ? (hasTestError ? <StatusDot type="error" /> : <StatusDot />) : null,
      docs: docs?.length > 0 ? <StatusDot /> : null,
      settings: tags?.length > 0 ? <StatusDot /> : null
    };
  }, [activeCounts, body.mode, auth.mode, script, item.preRequestScriptErrorMessage, item.postResponseScriptErrorMessage, item.testScriptErrorMessage, tests, docs, tags]);

  const allTabs = useMemo(
    () => TAB_CONFIG.map(({ key, label }) => ({ key, label, indicator: indicators[key] })),
    [indicators]
  );

  const tabPanel = useMemo(() => {
    const Component = TAB_PANELS[requestPaneTab];
    return Component ? <Component key={item.uid} item={item} collection={collection} /> : <div className="mt-4">{t('REQUEST_PANE.NOT_FOUND')}</div>;
  }, [requestPaneTab, item, collection]);

  if (!activeTabUid || !focusedTab?.uid || !requestPaneTab) {
    return <div className="pb-4 px-4">{t('REQUEST_PANE.AN_ERROR_OCCURRED')}</div>;
  }

  const rightContent = requestPaneTab === 'body' ? (
    <div ref={rightContentRef}>
      <RequestBodyMode item={item} collection={collection} />
    </div>
  ) : requestPaneTab === 'auth' ? (
    <div ref={rightContentRef} className="flex flex-grow justify-start items-center">
      <AuthMode item={item} collection={collection} />
    </div>
  ) : null;

  return (
    <div className="flex flex-col h-full relative">
      <ResponsiveTabs
        tabs={allTabs}
        activeTab={requestPaneTab}
        onTabSelect={selectTab}
        rightContent={rightContent}
        rightContentRef={rightContent ? rightContentRef : null}
        delayedTabs={['body']}
      />

      <section className={classnames('flex w-full flex-1 mt-4')}>
        <HeightBoundContainer>{tabPanel}</HeightBoundContainer>
      </section>
    </div>
  );
};

export default HttpRequestPane;
