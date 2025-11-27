import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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
import Dropdown from 'components/Dropdown';
import { IconDots } from '@tabler/icons';
import HeightBoundContainer from 'ui/HeightBoundContainer';
import StyledWrapper from './StyledWrapper';

const DROPDOWN_WIDTH = 60;
const DEFAULT_TAB_ORDER = ['params', 'body', 'headers', 'auth', 'vars', 'script', 'assert', 'tests', 'docs', 'settings'];
const CALCULATION_DELAY_DEFAULT = 50;
const CALCULATION_DELAY_BODY_TAB = 150;
const MULTIPLE_CONTENT_TABS = ['params', 'script', 'vars', 'auth', 'docs'];

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

  const [visibleTabs, setVisibleTabs] = useState([]);
  const [overflowTabs, setOverflowTabs] = useState([]);

  const tabsContainerRef = useRef(null);
  const tabRefsMap = useRef({});
  const bodyModeRef = useRef(null);
  const dropdownTippyRef = useRef(null);

  if (!activeTabUid) {
    return <div>Something went wrong</div>;
  }

  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  if (!focusedTab?.uid || !focusedTab?.requestPaneTab) {
    return <div className="pb-4 px-4">An error occurred!</div>;
  }

  // Helper to get property from draft or request
  const getProperty = useCallback((key) => (item.draft ? get(item, `draft.${key}`, []) : get(item, key, [])),
    [item]);

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
  }),
  [params, headers, assertions, requestVars, responseVars]);

  const getIndicator = useCallback((tabKey) => {
    switch (tabKey) {
      case 'params':
          return activeCounts.params > 0 ? <sup className="font-medium">{activeCounts.params}</sup> : null;
      case 'body':
        return body.mode !== 'none' ? <StatusDot /> : null;
      case 'headers':
        return activeCounts.headers > 0 ? <sup className="font-medium">{activeCounts.headers}</sup> : null;
      case 'auth':
        return auth.mode !== 'none' ? <StatusDot /> : null;
      case 'vars':
        return activeCounts.vars > 0 ? <sup className="font-medium">{activeCounts.vars}</sup> : null;
      case 'script':
        return script.req || script.res ? (
          item.preRequestScriptErrorMessage || item.postResponseScriptErrorMessage ? (
            <StatusDot type="error" />
          ) : (
            <StatusDot />
          )
          ) : null;
        case 'assert':
          return activeCounts.assertions > 0 ? <sup className="font-medium">{activeCounts.assertions}</sup> : null;
        case 'tests':
          return tests?.length > 0 ? (
          item.testScriptErrorMessage ? <StatusDot type="error" /> : <StatusDot />
        ) : null;
      case 'docs':
        return docs?.length > 0 ? <StatusDot /> : null;
      case 'settings':
        return tags?.length > 0 ? <StatusDot /> : null;
      default:
        return null;
    }
  },
  [activeCounts, body.mode, auth.mode, script, item, tests, docs, tags]);

  const TAB_LABELS = {
    params: 'Params',
    body: 'Body',
    headers: 'Headers',
    auth: 'Auth',
    vars: 'Vars',
    script: 'Script',
    assert: 'Assert',
    tests: 'Tests',
    docs: 'Docs',
    settings: 'Settings'
  };

  const allTabs = useMemo(() =>
    DEFAULT_TAB_ORDER.map((key) => ({
      key,
      label: TAB_LABELS[key],
      indicator: getIndicator(key)
    })),
  [getIndicator]);

  const selectTab = useCallback((tabKey) => {
    dispatch(updateRequestPaneTab({ uid: item.uid, requestPaneTab: tabKey }));
    dropdownTippyRef.current?.hide();
  },
  [dispatch, item.uid]);

  const calculateTabVisibility = useCallback(() => {
    if (!tabsContainerRef.current || !allTabs.length) return;

    const containerWidth = tabsContainerRef.current.offsetWidth;
    const activeTabKey = focusedTab.requestPaneTab;
    const bodyModeWidth
      = focusedTab.requestPaneTab === 'body' && bodyModeRef.current
        ? bodyModeRef.current.offsetWidth + 20
        : 0;

    const availableWidth = containerWidth - bodyModeWidth - DROPDOWN_WIDTH;
    const visible = [];
    const overflow = [];
    let currentWidth = 0;

    for (const tab of allTabs) {
      const tabElement = tabRefsMap.current[tab.key];
      const tabWidth = tabElement ? tabElement.offsetWidth + 20 : 100;

      if (currentWidth + tabWidth <= availableWidth && !overflow.length) {
        visible.push(tab);
        currentWidth += tabWidth;
      } else {
        overflow.push(tab);
      }
    }

    // Ensure active tab is always visible
    const isActiveVisible = visible.some((t) => t.key === activeTabKey);
    if (!isActiveVisible && overflow.length) {
      const activeTabIndex = overflow.findIndex((t) => t.key === activeTabKey);
      if (activeTabIndex !== -1) {
        const [activeTab] = overflow.splice(activeTabIndex, 1);
        const lastVisible = visible.pop();
        if (lastVisible) overflow.unshift(lastVisible);
        visible.push(activeTab);
      }
    }

    setVisibleTabs(visible);
    setOverflowTabs(overflow);
  }, [allTabs, focusedTab.requestPaneTab]);

  const getTabPanel = useCallback(() => {
    const Component = TAB_PANELS[focusedTab.requestPaneTab];
    return Component ? <Component item={item} collection={collection} /> : <div className="mt-4">404 | Not found</div>;
  }, [focusedTab.requestPaneTab, item, collection]);

  const renderTab = useCallback((tab, isInDropdown = false) => {
    const isActive = tab.key === focusedTab.requestPaneTab;

      if (isInDropdown) {
        return (
        <div
          key={tab.key}
          className={classnames('dropdown-item', { active: isActive })}
          role="tab"
            onClick={() => selectTab(tab.key)}
        >
          <span className="flex items-center gap-1">
            {tab.label}
            {tab.indicator}
          </span>
        </div>
      );
    }

    return (
      <div
        key={tab.key}
        className={classnames('tab select-none', tab.key, { active: isActive })}
        role="tab"
        onClick={() => selectTab(tab.key)}
        ref={(el) => el && (tabRefsMap.current[tab.key] = el)}
      >
        {tab.label}
        {tab.indicator}
        </div>
      );
    },
    [focusedTab.requestPaneTab, selectTab]);

  // Auto-select body tab if no params
  useEffect(() => {
    if (activeCounts.params === 0 && body.mode !== 'none') {
      selectTab('body');
    }
  }, []);

  useEffect(() => {
    const delay = focusedTab.requestPaneTab === 'body' ? CALCULATION_DELAY_BODY_TAB : CALCULATION_DELAY_DEFAULT;
    const timeoutId = setTimeout(() => requestAnimationFrame(calculateTabVisibility), delay);
    return () => clearTimeout(timeoutId);
  }, [
    calculateTabVisibility,
    activeCounts,
    body.mode,
    auth.mode,
    script,
    tests,
    docs,
    tags,
    focusedTab.requestPaneTab
  ]);

  // Observe container and body mode resize
  useEffect(() => {
    let timeoutId = null;
    const observer = new ResizeObserver(() => {
      if (timeoutId) cancelAnimationFrame(timeoutId);
      timeoutId = requestAnimationFrame(calculateTabVisibility);
    });

    if (tabsContainerRef.current) observer.observe(tabsContainerRef.current);
    if (bodyModeRef.current) observer.observe(bodyModeRef.current);

    return () => {
      if (timeoutId) cancelAnimationFrame(timeoutId);
      observer.disconnect();
    };
  }, [calculateTabVisibility]);

  useEffect(() => {
    if (focusedTab.requestPaneTab === 'body' && bodyModeRef.current) {
      const timeoutId = setTimeout(() => requestAnimationFrame(calculateTabVisibility), 150);
      return () => clearTimeout(timeoutId);
    }
  }, [focusedTab.requestPaneTab, calculateTabVisibility]);

  const isMultipleContentTab = MULTIPLE_CONTENT_TABS.includes(focusedTab.requestPaneTab);

  return (
    <StyledWrapper className="flex flex-col h-full relative">
      <div ref={tabsContainerRef} className="flex items-center tabs" role="tablist">
        <div style={{ visibility: 'hidden', position: 'absolute', display: 'flex', pointerEvents: 'none' }}>
          {allTabs.map((tab) => (
            <div
              key={tab.key}
              className={classnames('tab select-none', tab.key, {
                active: tab.key === focusedTab.requestPaneTab
              })}
              ref={(el) => el && (tabRefsMap.current[tab.key] = el)}
            >
              {tab.label}
              {tab.indicator}
            </div>
          ))}
        </div>

        {visibleTabs.map((tab) => renderTab(tab))}

        {overflowTabs.length > 0 && (
          <Dropdown
            icon={(
              <div className="tab more-tabs select-none flex items-center cursor-pointer rounded-md" style={{ padding: '2px 8px' }}>
                <IconDots size={18} />
              </div>
            )}
            placement="bottom-start"
            onCreate={(instance) => (dropdownTippyRef.current = instance)}
          >
            <div style={{ minWidth: '150px' }}>{overflowTabs.map((tab) => renderTab(tab, true))}</div>
          </Dropdown>
        )}

        {/* Body mode selector */}
        {focusedTab.requestPaneTab === 'body' && (
          <div className="flex flex-grow justify-end items-center">
            <div ref={bodyModeRef}>
              <RequestBodyMode item={item} collection={collection} />
            </div>
          </div>
        )}
      </div>

      {/* Tab content */}
      <section className={classnames('flex w-full flex-1', { 'mt-3': !isMultipleContentTab })}>
        <HeightBoundContainer>{getTabPanel()}</HeightBoundContainer>
      </section>
    </StyledWrapper>
  );
};

export default HttpRequestPane;
