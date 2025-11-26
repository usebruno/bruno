import React, { useEffect, useState, useRef } from 'react';
import classnames from 'classnames';
import { useSelector, useDispatch } from 'react-redux';
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
import StyledWrapper from './StyledWrapper';
import { find, get } from 'lodash';
import Documentation from 'components/Documentation/index';
import HeightBoundContainer from 'ui/HeightBoundContainer';
import StatusDot from 'components/StatusDot';
import Settings from 'components/RequestPane/Settings';

const HttpRequestPane = ({ item, collection }) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const [visibleTabs, setVisibleTabs] = useState([]);
  const [overflowTabs, setOverflowTabs] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const tabsContainerRef = useRef(null);
  const dropdownRef = useRef(null);

  const selectTab = (tab) => {
    dispatch(
      updateRequestPaneTab({
        uid: item.uid,
        requestPaneTab: tab
      })
    );
    setDropdownOpen(false);
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
      case 'settings': {
        return <Settings item={item} collection={collection} />;
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
  const tags = getPropertyFromDraftOrRequest('tags');

  const activeParamsLength = params.filter((param) => param.enabled).length;
  const activeHeadersLength = headers.filter((header) => header.enabled).length;
  const activeAssertionsLength = assertions.filter((assertion) => assertion.enabled).length;
  const activeVarsLength =
    requestVars.filter((request) => request.enabled).length +
    responseVars.filter((response) => response.enabled).length;

  useEffect(() => {
    if (activeParamsLength === 0 && body.mode !== 'none') {
      selectTab('body');
    }
  }, []);

  // Define all tabs
  const allTabs = [
    { name: 'params', label: 'Params', badge: activeParamsLength > 0 ? activeParamsLength : null },
    { name: 'body', label: 'Body', hasDot: body.mode !== 'none' },
    { name: 'headers', label: 'Headers', badge: activeHeadersLength > 0 ? activeHeadersLength : null },
    { name: 'auth', label: 'Auth', hasDot: auth.mode !== 'none' },
    { name: 'vars', label: 'Vars', badge: activeVarsLength > 0 ? activeVarsLength : null },
    {
      name: 'script',
      label: 'Script',
      hasDot: !!(script.req || script.res),
      hasError: !!(item.preRequestScriptErrorMessage || item.postResponseScriptErrorMessage)
    },
    { name: 'assert', label: 'Assert', badge: activeAssertionsLength > 0 ? activeAssertionsLength : null },
    {
      name: 'tests',
      label: 'Tests',
      hasDot: !!(tests && tests.length > 0),
      hasError: !!item.testScriptErrorMessage
    },
    { name: 'docs', label: 'Docs', hasDot: !!(docs && docs.length > 0) },
    { name: 'settings', label: 'Settings', hasDot: !!(tags && tags.length > 0) }
  ];

  // Calculate visible and overflow tabs
  useEffect(() => {
    const calculateVisibleTabs = () => {
      if (!tabsContainerRef.current) return;

      const container = tabsContainerRef.current;
      const containerWidth = container.offsetWidth;
      const dropdownButtonWidth = 200; // Reserve space for dropdown button + body mode selector
      const tabWidth = 90; // Approximate width per tab

      const maxVisibleTabs = Math.max(3, Math.floor((containerWidth - dropdownButtonWidth) / tabWidth));

      if (maxVisibleTabs >= allTabs.length) {
        setVisibleTabs(allTabs);
        setOverflowTabs([]);
      } else {
        // Ensure active tab is always visible
        const activeTabIndex = allTabs.findIndex((t) => t.name === focusedTab?.requestPaneTab);
        let visible = [];
        let overflow = [];

        if (activeTabIndex === -1 || activeTabIndex < maxVisibleTabs) {
          visible = allTabs.slice(0, maxVisibleTabs);
          overflow = allTabs.slice(maxVisibleTabs);
        } else {
          // Put active tab at the end of visible tabs
          visible = [
            ...allTabs.slice(0, maxVisibleTabs - 1),
            allTabs[activeTabIndex]
          ];
          overflow = [
            ...allTabs.slice(maxVisibleTabs - 1, activeTabIndex),
            ...allTabs.slice(activeTabIndex + 1)
          ];
        }

        setVisibleTabs(visible);
        setOverflowTabs(overflow);
      }
    };

    calculateVisibleTabs();

    // Use ResizeObserver for better performance and real-time updates
    const resizeObserver = new ResizeObserver(() => {
      calculateVisibleTabs();
    });

    if (tabsContainerRef.current) {
      resizeObserver.observe(tabsContainerRef.current);
    }

    // Also listen to window resize as fallback
    window.addEventListener('resize', calculateVisibleTabs);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', calculateVisibleTabs);
    };
  }, [focusedTab?.requestPaneTab, activeParamsLength, activeHeadersLength, activeAssertionsLength, activeVarsLength, body.mode, auth.mode, script.req, script.res, item.preRequestScriptErrorMessage, item.postResponseScriptErrorMessage, item.testScriptErrorMessage]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  const renderTab = (tab) => {
    const isActive = tab.name === focusedTab.requestPaneTab;
    return (
      <div
        key={tab.name}
        className={getTabClassname(tab.name)}
        role="tab"
        onClick={() => selectTab(tab.name)}
        aria-selected={isActive}
      >
        {tab.label}
        {tab.badge && <span className="tab-badge">{tab.badge}</span>}
        {tab.hasDot && <StatusDot type={tab.hasError ? 'error' : undefined} />}
      </div>
    );
  };

  return (
    <StyledWrapper className="flex flex-col h-full relative">
      <div className="flex items-center tabs-container" role="tablist" ref={tabsContainerRef}>
        <div className="flex items-center tabs-visible">
          {visibleTabs.map(renderTab)}
        </div>
        {overflowTabs.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <div
              className={classnames('tab-overflow-button', {
                active: overflowTabs.some((t) => t.name === focusedTab.requestPaneTab)
              })}
              onClick={() => setDropdownOpen(!dropdownOpen)}
              role="button"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              More
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="ml-1"
                style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
              >
                <path d="M4.47 5.47a.75.75 0 011.06 0L8 7.94l2.47-2.47a.75.75 0 111.06 1.06l-3 3a.75.75 0 01-1.06 0l-3-3a.75.75 0 010-1.06z" />
              </svg>
            </div>
            {dropdownOpen && (
              <div className="tab-overflow-dropdown">
                {overflowTabs.map((tab) => (
                  <div
                    key={tab.name}
                    className={classnames('tab-overflow-item', {
                      active: tab.name === focusedTab.requestPaneTab
                    })}
                    onClick={() => selectTab(tab.name)}
                    role="menuitem"
                  >
                    <span>{tab.label}</span>
                    {tab.badge && <span className="badge">{tab.badge}</span>}
                    {tab.hasDot && <StatusDot type={tab.hasError ? 'error' : undefined} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {focusedTab.requestPaneTab === 'body' && (
          <div className="flex flex-grow justify-end items-center">
            <RequestBodyMode item={item} collection={collection} />
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
