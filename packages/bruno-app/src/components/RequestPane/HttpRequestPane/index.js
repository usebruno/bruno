import classnames from 'classnames';
import Documentation from 'components/Documentation/index';
import Assertions from 'components/RequestPane/Assertions';
import Auth from 'components/RequestPane/Auth';
import QueryParams from 'components/RequestPane/QueryParams';
import RequestBody from 'components/RequestPane/RequestBody';
import RequestBodyMode from 'components/RequestPane/RequestBody/RequestBodyMode';
import RequestHeaders from 'components/RequestPane/RequestHeaders';
import Script from 'components/RequestPane/Script';
import Settings from 'components/RequestPane/Settings';
import Tests from 'components/RequestPane/Tests';
import Vars from 'components/RequestPane/Vars';
import StatusDot from 'components/StatusDot';
import { find, get } from 'lodash';
import { updateRequestTabOrder } from 'providers/ReduxStore/slices/collections/actions';
import { updateRequestPaneTab } from 'providers/ReduxStore/slices/tabs';
import React, { useCallback, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import HeightBoundContainer from 'ui/HeightBoundContainer';
import ResponsiveTabs from 'ui/ResponsiveTabs';
import { getEffectiveTabOrder, sortTabs } from 'utils/tabs';
import AuthMode from '../Auth/AuthMode/index';

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
  const preferences = useSelector((state) => state.app.preferences);

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

  const effectiveTabOrder = useMemo(() => getEffectiveTabOrder(item, collection, preferences), [item, collection, preferences]);

  const allTabs = useMemo(() => {
    const tabs = TAB_CONFIG.map(({ key, label }) => ({ key, label, indicator: indicators[key] }));
    return sortTabs(tabs, effectiveTabOrder);
  }, [indicators, effectiveTabOrder]);

  const handleTabReorder = useCallback(
    (dragIndex, hoverIndex) => {
      const newOrder = allTabs.map((t) => t.key);
      const [moved] = newOrder.splice(dragIndex, 1);
      newOrder.splice(hoverIndex, 0, moved);

      dispatch(updateRequestTabOrder(collection.uid, item.uid, newOrder));
    },
    [allTabs, dispatch, collection.uid, item.uid]
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
        onTabReorder={handleTabReorder}
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
