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
import IconCaretDown from 'components/Icons/IconCaretDown';
import HeightBoundContainer from 'ui/HeightBoundContainer';
import StyledWrapper from './StyledWrapper';

const DROPDOWN_WIDTH = 60;
const TAB_MARGIN_RIGHT = 20;
const BODY_MODE_PADDING = 20;
const DEFAULT_TAB_ORDER = ['params', 'body', 'headers', 'auth', 'vars', 'script', 'assert', 'tests', 'docs', 'settings'];
const CALCULATION_DELAY_DEFAULT = 50;
const CALCULATION_DELAY_BODY_TAB = 150;
const BODY_MODE_RENDER_DELAY = 200;

const HttpRequestPane = ({ item, collection }) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);

  const [visibleTabs, setVisibleTabs] = useState([]);
  const [overflowTabs, setOverflowTabs] = useState([]);
  const [tabOrder, setTabOrder] = useState([]);

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

  const getPropertyFromDraftOrRequest = useCallback((propertyKey) => (item.draft ? get(item, `draft.${propertyKey}`, []) : get(item, propertyKey, [])),
    [item]);

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
  const tags = getPropertyFromDraftOrRequest('tags');

  const activeParamsLength = useMemo(() => params.filter((param) => param.enabled).length, [params]);
  const activeHeadersLength = useMemo(() => headers.filter((header) => header.enabled).length, [headers]);
  const activeAssertionsLength = useMemo(() => assertions.filter((assertion) => assertion.enabled).length, [assertions]);
  const activeVarsLength = useMemo(() =>
    requestVars.filter((request) => request.enabled).length
    + responseVars.filter((response) => response.enabled).length,
  [requestVars, responseVars]);

  const allTabsMetadata = useMemo(() => ({
    params: {
      key: 'params',
      label: 'Params',
      indicator: activeParamsLength > 0 ? <sup className="font-medium">{activeParamsLength}</sup> : null
    },
    body: {
      key: 'body',
      label: 'Body',
      indicator: body.mode !== 'none' ? <StatusDot /> : null
    },
    headers: {
      key: 'headers',
      label: 'Headers',
      indicator: activeHeadersLength > 0 ? <sup className="font-medium">{activeHeadersLength}</sup> : null
    },
    auth: {
      key: 'auth',
      label: 'Auth',
      indicator: auth.mode !== 'none' ? <StatusDot /> : null
    },
    vars: {
      key: 'vars',
      label: 'Vars',
      indicator: activeVarsLength > 0 ? <sup className="font-medium">{activeVarsLength}</sup> : null
    },
    script: {
      key: 'script',
      label: 'Script',
      indicator:
          script.req || script.res ? (
            item.preRequestScriptErrorMessage || item.postResponseScriptErrorMessage ? (
              <StatusDot type="error" />
            ) : (
              <StatusDot />
            )
          ) : null
    },
    assert: {
      key: 'assert',
      label: 'Assert',
      indicator: activeAssertionsLength > 0 ? <sup className="font-medium">{activeAssertionsLength}</sup> : null
    },
    tests: {
      key: 'tests',
      label: 'Tests',
      indicator:
          tests && tests.length > 0 ? (
            item.testScriptErrorMessage ? (
              <StatusDot type="error" />
            ) : (
              <StatusDot />
            )
          ) : null
    },
    docs: {
      key: 'docs',
      label: 'Docs',
      indicator: docs && docs.length > 0 ? <StatusDot /> : null
    },
    settings: {
      key: 'settings',
      label: 'Settings',
      indicator: tags && tags.length > 0 ? <StatusDot /> : null
    }
  }),
  [
    activeParamsLength,
    body.mode,
    activeHeadersLength,
    auth.mode,
    activeVarsLength,
    script,
    item.preRequestScriptErrorMessage,
    item.postResponseScriptErrorMessage,
    activeAssertionsLength,
    tests,
    item.testScriptErrorMessage,
    docs,
    tags
  ]);

  const allTabs = useMemo(() => tabOrder.map((key) => allTabsMetadata[key]).filter(Boolean), [tabOrder, allTabsMetadata]);
  const selectTab = useCallback((tabKey, fromDropdown = false) => {
    dispatch(updateRequestPaneTab({
      uid: item.uid,
      requestPaneTab: tabKey
    }));

    if (fromDropdown && overflowTabs.some((t) => t.key === tabKey)) {
      setTabOrder((prevOrder) => {
        const newOrder = [...prevOrder];
        const selectedTabIndex = newOrder.indexOf(tabKey);
        const lastVisibleTab = visibleTabs[visibleTabs.length - 1];
        const lastVisibleIndex = lastVisibleTab ? newOrder.indexOf(lastVisibleTab.key) : -1;

        // Swap positions if both indices are valid
        if (selectedTabIndex !== -1 && lastVisibleIndex !== -1) {
          [newOrder[selectedTabIndex], newOrder[lastVisibleIndex]] = [
            newOrder[lastVisibleIndex],
            newOrder[selectedTabIndex]
          ];
        }

        return newOrder;
      });
    }

    dropdownTippyRef.current?.hide();
  },
  [dispatch, item.uid, overflowTabs, visibleTabs]);

  const calculateTabVisibility = useCallback(() => {
    if (!tabsContainerRef.current || allTabs.length === 0) return;

    const containerWidth = tabsContainerRef.current.offsetWidth;
    const activeTabKey = focusedTab.requestPaneTab;

    let bodyModeWidth = 0;
    if (focusedTab.requestPaneTab === 'body') {
      bodyModeWidth = bodyModeRef.current ? bodyModeRef.current.offsetWidth + BODY_MODE_PADDING : 0;
    }

    const distributeTabsAcrossWidth = (availableWidth) => {
      const visible = [];
      const overflow = [];
      let totalWidth = 0;
      let activeTabIncluded = false;

      allTabs.forEach((tab) => {
        const tabElement = tabRefsMap.current[tab.key];
        if (!tabElement) return;

        const tabWidth = tabElement.offsetWidth + TAB_MARGIN_RIGHT;
        const canFit = totalWidth + tabWidth <= availableWidth;
        const isActiveTab = tab.key === activeTabKey;

        if (canFit) {
          visible.push(tab);
          totalWidth += tabWidth;
          if (isActiveTab) activeTabIncluded = true;
        } else {
          overflow.push(tab);
        }
      });

      if (!activeTabIncluded && overflow.length > 0) {
        const activeTab = overflow.find((tab) => tab.key === activeTabKey);
        if (activeTab) {
          const removedTab = visible.pop();
          if (removedTab) {
            overflow.unshift(removedTab);
            overflow.splice(overflow.indexOf(activeTab), 1);
            visible.push(activeTab);
          }
        }
      }

      return { visible, overflow };
    };

    let result = distributeTabsAcrossWidth(containerWidth - bodyModeWidth - DROPDOWN_WIDTH);

    if (result.overflow.length === 0) {
      result = distributeTabsAcrossWidth(containerWidth - bodyModeWidth);
    }

    setVisibleTabs(result.visible);
    setOverflowTabs(result.overflow);
  }, [allTabs, focusedTab.requestPaneTab]);

  const getTabPanel = useCallback((tab) => {
    const commonProps = { item, collection };

    switch (tab) {
      case 'params':
        return <QueryParams {...commonProps} />;
      case 'body':
        return <RequestBody {...commonProps} />;
      case 'headers':
        return <RequestHeaders {...commonProps} />;
      case 'auth':
        return <Auth {...commonProps} />;
      case 'vars':
        return <Vars {...commonProps} />;
      case 'assert':
        return <Assertions {...commonProps} />;
      case 'script':
        return <Script {...commonProps} />;
      case 'tests':
        return <Tests {...commonProps} />;
      case 'docs':
        return <Documentation {...commonProps} />;
      case 'settings':
        return <Settings {...commonProps} />;
      default:
        return <div className="mt-4">404 | Not found</div>;
    }
  },
  [item, collection]);

  const renderTab = useCallback((tab, isInDropdown = false) => {
    if (isInDropdown) {
      return (
        <div
          key={tab.key}
          className={`dropdown-item ${tab.key === focusedTab.requestPaneTab ? 'active' : ''}`}
          role="tab"
          onClick={() => selectTab(tab.key, true)}
        >
          <span className="flex items-center gap-1">
            {tab.label}
            {tab.indicator}
          </span>
        </div>
      );
    }

    const tabClassName = classnames(`tab select-none ${tab.key}`, {
      active: tab.key === focusedTab.requestPaneTab
    });

    return (
      <div
        key={tab.key}
        className={tabClassName}
        role="tab"
        onClick={() => selectTab(tab.key, false)}
        ref={(el) => {
          if (el) {
            tabRefsMap.current[tab.key] = el;
          }
        }}
      >
        {tab.label}
        {tab.indicator}
      </div>
    );
  },
  [focusedTab.requestPaneTab, selectTab]);

  useEffect(() => {
    if (tabOrder.length === 0) {
      setTabOrder(DEFAULT_TAB_ORDER);
    }
  }, [tabOrder.length]);

  useEffect(() => {
    if (activeParamsLength === 0 && body.mode !== 'none') {
      selectTab('body');
    }
  }, []);

  useEffect(() => {
    const delay = focusedTab.requestPaneTab === 'body' ? CALCULATION_DELAY_BODY_TAB : CALCULATION_DELAY_DEFAULT;

    const timeoutId = setTimeout(() => {
      requestAnimationFrame(() => {
        calculateTabVisibility();
      });
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [
    calculateTabVisibility,
    activeParamsLength,
    activeHeadersLength,
    activeAssertionsLength,
    activeVarsLength,
    body.mode,
    auth.mode,
    script,
    tests,
    docs,
    tags,
    focusedTab.requestPaneTab,
    tabOrder
  ]);

  useEffect(() => {
    let resizeTimeoutId = null;

    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimeoutId) {
        cancelAnimationFrame(resizeTimeoutId);
      }

      resizeTimeoutId = requestAnimationFrame(() => {
        calculateTabVisibility();
      });
    });

    if (tabsContainerRef.current) {
      resizeObserver.observe(tabsContainerRef.current);
    }

    if (bodyModeRef.current) {
      resizeObserver.observe(bodyModeRef.current);
    }

    return () => {
      if (resizeTimeoutId) {
        cancelAnimationFrame(resizeTimeoutId);
      }
      resizeObserver.disconnect();
    };
  }, [calculateTabVisibility, focusedTab.requestPaneTab]);

  useEffect(() => {
    if (focusedTab.requestPaneTab === 'body' && bodyModeRef.current) {
      const timeoutId = setTimeout(() => {
        requestAnimationFrame(() => {
          calculateTabVisibility();
        });
      }, BODY_MODE_RENDER_DELAY);

      return () => clearTimeout(timeoutId);
    }
  }, [focusedTab.requestPaneTab, calculateTabVisibility]);

  const isMultipleContentTab = useMemo(() => ['params', 'script', 'vars', 'auth', 'docs'].includes(focusedTab.requestPaneTab),
    [focusedTab.requestPaneTab]);

  return (
    <StyledWrapper className="flex flex-col h-full relative">
      <div ref={tabsContainerRef} className="flex items-center tabs" role="tablist">
        <div style={{ visibility: 'hidden', position: 'absolute', display: 'flex', pointerEvents: 'none' }}>
          {allTabs.map((tab) => {
            const tabClassName = classnames(`tab select-none ${tab.key}`, {
              active: tab.key === focusedTab.requestPaneTab
            });

            return (
              <div
                key={tab.key}
                className={tabClassName}
                ref={(el) => {
                  if (el) {
                    tabRefsMap.current[tab.key] = el;
                  }
                }}
              >
                {tab.label}
                {tab.indicator}
              </div>
            );
          })}
        </div>

        {visibleTabs.map((tab) => renderTab(tab, false))}

        {overflowTabs.length > 0 && (
          <Dropdown
            icon={(
              <div className="tab select-none flex items-center cursor-pointer" style={{ padding: '6px 8px' }}>
                <IconCaretDown />
              </div>
            )}
            placement="bottom-start"
            onCreate={(instance) => {
              dropdownTippyRef.current = instance;
            }}
          >
            <div style={{ minWidth: '150px' }}>{overflowTabs.map((tab) => renderTab(tab, true))}</div>
          </Dropdown>
        )}

        {focusedTab.requestPaneTab === 'body' && (
          <div className="flex flex-grow justify-end items-center">
            <div ref={bodyModeRef}>
              <RequestBodyMode item={item} collection={collection} />
            </div>
          </div>
        )}
      </div>
      <section
        className={classnames('flex w-full flex-1', {
          'mt-5': !isMultipleContentTab
        })}
      >
        <HeightBoundContainer>
          {getTabPanel(focusedTab.requestPaneTab)}
        </HeightBoundContainer>
      </section>
    </StyledWrapper>
  );
};

export default HttpRequestPane;
