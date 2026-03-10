import React, { useRef, useCallback, useMemo } from 'react';
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
import { hasActiveWarningsForLocations } from 'utils/warnings';

const TAB_CONFIG = [
  { key: 'params', label: 'Params' },
  { key: 'body', label: 'Body' },
  { key: 'headers', label: 'Headers' },
  { key: 'auth', label: 'Auth' },
  { key: 'vars', label: 'Vars' },
  { key: 'script', label: 'Script' },
  { key: 'assert', label: 'Assert' },
  { key: 'tests', label: 'Tests' },
  { key: 'docs', label: 'Docs' },
  { key: 'settings', label: 'Settings' }
];

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
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);

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
    const hasScriptWarning = hasActiveWarningsForLocations(item, ['pre-request-script', 'post-response-script']);
    const hasTestWarning = hasActiveWarningsForLocations(item, ['tests']);

    const hasScript = script.req || script.res;
    const hasTests = tests?.length > 0;

    const getScriptIndicator = () => {
      if (hasScriptWarning) return <StatusDot type="warning" />;
      if (!hasScript) return null;
      return hasScriptError ? <StatusDot type="error" /> : <StatusDot />;
    };

    const getTestIndicator = () => {
      if (hasTestWarning) return <StatusDot type="warning" />;
      if (!hasTests) return null;
      return hasTestError ? <StatusDot type="error" /> : <StatusDot />;
    };

    const getScriptIndicatorType = () => {
      if (hasScriptWarning) return 'warning';
      if (hasScriptError) return 'error';
      return null;
    };

    const getTestIndicatorType = () => {
      if (hasTestWarning) return 'warning';
      if (hasTestError) return 'error';
      return null;
    };

    return {
      params: activeCounts.params > 0 ? <sup className="font-medium">{activeCounts.params}</sup> : null,
      body: body.mode !== 'none' ? <StatusDot /> : null,
      headers: activeCounts.headers > 0 ? <sup className="font-medium">{activeCounts.headers}</sup> : null,
      auth: auth.mode !== 'none' ? <StatusDot /> : null,
      vars: activeCounts.vars > 0 ? <sup className="font-medium">{activeCounts.vars}</sup> : null,
      script: getScriptIndicator(),
      assert: activeCounts.assertions > 0 ? <sup className="font-medium">{activeCounts.assertions}</sup> : null,
      tests: getTestIndicator(),
      docs: docs?.length > 0 ? <StatusDot /> : null,
      settings: tags?.length > 0 ? <StatusDot /> : null,
      scriptType: getScriptIndicatorType(),
      testsType: getTestIndicatorType()
    };
  }, [activeCounts, body.mode, auth.mode, script, item.preRequestScriptErrorMessage, item.postResponseScriptErrorMessage, item.testScriptErrorMessage, item.warnings, item.dismissedWarningRules, tests, docs, tags]);

  const allTabs = useMemo(
    () => TAB_CONFIG.map(({ key, label }) => ({
      key,
      label,
      indicator: indicators[key],
      indicatorType: indicators[`${key}Type`] || null
    })),
    [indicators]
  );

  const tabPanel = useMemo(() => {
    const Component = TAB_PANELS[requestPaneTab];
    return Component ? <Component item={item} collection={collection} /> : <div className="mt-4">404 | Not found</div>;
  }, [requestPaneTab, item, collection]);

  if (!activeTabUid || !focusedTab?.uid || !requestPaneTab) {
    return <div className="pb-4 px-4">An error occurred!</div>;
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
