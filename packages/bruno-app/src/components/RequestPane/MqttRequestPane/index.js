import React, { useMemo, useCallback, useRef } from 'react';
import Documentation from 'components/Documentation/index';
import Vars from 'components/RequestPane/Vars';
import Assertions from 'components/RequestPane/Assertions';
import Script from 'components/RequestPane/Script';
import Tests from 'components/RequestPane/Tests';
import { find } from 'lodash';
import { updateRequestPaneTab } from 'providers/ReduxStore/slices/tabs';
import { useDispatch, useSelector } from 'react-redux';
import HeightBoundContainer from 'ui/HeightBoundContainer';
import ResponsiveTabs from 'ui/ResponsiveTabs';
import MqttPublish from '../MqttPublish/index';
import MqttSubscriptions from '../MqttSubscriptions/index';
import MqttSettingsPane from '../MqttSettingsPane/index';
import StyledWrapper from './StyledWrapper';

const MqttRequestPane = ({ item, collection }) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);

  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const requestPaneTab = focusedTab?.requestPaneTab;

  const selectTab = useCallback(
    (tab) => {
      dispatch(updateRequestPaneTab({
        uid: item.uid,
        requestPaneTab: tab
      }));
    },
    [dispatch, item.uid]
  );

  const subscriptions = item.draft
    ? item.draft.request?.subscriptions || []
    : item.request?.subscriptions || [];
  const activeSubsCount = subscriptions.filter((s) => s.enabled).length;

  const allTabs = useMemo(() => {
    return [
      { key: 'publish', label: 'Publish', indicator: null },
      {
        key: 'subscribe',
        label: 'Subscribe',
        indicator: activeSubsCount > 0 ? <sup className="ml-[.125rem] font-medium">{activeSubsCount}</sup> : null
      },
      { key: 'settings', label: 'Settings', indicator: null },
      { key: 'script', label: 'Script', indicator: null },
      { key: 'vars', label: 'Vars', indicator: null },
      { key: 'assert', label: 'Assert', indicator: null },
      { key: 'tests', label: 'Tests', indicator: null },
      { key: 'docs', label: 'Docs', indicator: null }
    ];
  }, [activeSubsCount]);

  const tabPanel = useMemo(() => {
    switch (requestPaneTab) {
      case 'publish':
        return <MqttPublish item={item} collection={collection} />;
      case 'subscribe':
        return <MqttSubscriptions item={item} collection={collection} />;
      case 'settings':
        return <MqttSettingsPane item={item} collection={collection} />;
      case 'script':
        return <Script item={item} collection={collection} />;
      case 'vars':
        return <Vars item={item} collection={collection} />;
      case 'assert':
        return <Assertions item={item} collection={collection} />;
      case 'tests':
        return <Tests item={item} collection={collection} />;
      case 'docs':
        return <Documentation item={item} collection={collection} />;
      default:
        return <MqttPublish item={item} collection={collection} />;
    }
  }, [requestPaneTab, item, collection]);

  if (!activeTabUid || !focusedTab?.uid) {
    return <div className="pb-4 px-4">An error occurred!</div>;
  }

  return (
    <StyledWrapper className="flex flex-col h-full relative">
      <ResponsiveTabs
        tabs={allTabs}
        activeTab={requestPaneTab || 'publish'}
        onTabSelect={selectTab}
      />

      <section className="flex w-full flex-1 h-full mt-4">
        <HeightBoundContainer>{tabPanel}</HeightBoundContainer>
      </section>
    </StyledWrapper>
  );
};

export default MqttRequestPane;
