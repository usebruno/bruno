import React, { useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import find from 'lodash/find';
import get from 'lodash/get';
import { findItemInCollection, findItemInCollectionByPathname } from 'utils/collections';
import { ScopedPersistenceProvider } from 'hooks/usePersistedState/PersistedScopeProvider';
import TabPanelErrorBoundary from 'components/RequestTabPanel/TabPanelErrorBoundary';
import AppView from 'components/AppView';
import CollectionApp from 'components/CollectionApp';
import StyledWrapper from './StyledWrapper';

const APP_CAPABLE_TAB_TYPES = new Set([
  'app',
  'request',
  'http-request',
  'graphql-request',
  'grpc-request',
  'ws-request'
]);

const AppPreviewKeepAlive = () => {
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const collections = useSelector((state) => state.collections.collections);

  const everActiveRef = useRef(new Set());

  const appTabs = useMemo(() => {
    const out = [];
    for (const tab of tabs) {
      if (tab.type && !APP_CAPABLE_TAB_TYPES.has(tab.type)) continue;
      const collection = find(collections, (c) => c.uid === tab.collectionUid);
      // File-mode collections render everything through FileEditor.
      if (!collection || collection.fileMode) continue;
      let item = findItemInCollection(collection, tab.uid);
      if (!item && tab.pathname) {
        item = findItemInCollectionByPathname(collection, tab.pathname);
      }
      if (!item || item.partial || item.loading) continue;

      if (item.type === 'app') {
        out.push({ tabUid: tab.uid, collection, item, kind: 'standalone' });
        continue;
      }

      const itemSource = item.draft ? item.draft : item;
      const appEnabled = get(itemSource, 'settings.enableApp', false) === true
        && get(itemSource, 'app.enabled', false);
      if (appEnabled) {
        const code = get(itemSource, 'app.code', '');
        out.push({ tabUid: tab.uid, collection, item, kind: 'request', code });
      }
    }
    return out;
  }, [tabs, collections]);

  const validUids = new Set(appTabs.map((t) => t.tabUid));
  for (const uid of [...everActiveRef.current]) {
    if (!validUids.has(uid)) everActiveRef.current.delete(uid);
  }
  if (validUids.has(activeTabUid)) everActiveRef.current.add(activeTabUid);

  const mounted = appTabs.filter((t) => everActiveRef.current.has(t.tabUid));
  if (!mounted.length) return null;

  return (
    <StyledWrapper data-testid="app-preview-keepalive">
      {mounted.map(({ tabUid, collection, item, kind, code }) => {
        const isActive = tabUid === activeTabUid;
        return (
          <div
            key={tabUid}
            className={`app-preview-slot ${isActive ? 'active' : ''}`}
            aria-hidden={!isActive}
          >
            <TabPanelErrorBoundary tabUid={tabUid}>
              <ScopedPersistenceProvider scope={tabUid}>
                {kind === 'standalone' ? (
                  <CollectionApp item={item} collection={collection} />
                ) : (
                  <AppView item={item} collection={collection} code={code} />
                )}
              </ScopedPersistenceProvider>
            </TabPanelErrorBoundary>
          </div>
        );
      })}
    </StyledWrapper>
  );
};

export default AppPreviewKeepAlive;
