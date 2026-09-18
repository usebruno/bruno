import React, { useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import get from 'lodash/get';
import {
  findCollectionByUid,
  findItemInCollection,
  findItemInCollectionByPathname,
  getGlobalEnvironmentVariables,
  getGlobalEnvironmentVariablesMasked
} from 'utils/collections';
import { selectCollections } from 'src/selectors/collections';
import { selectTabs, selectActiveTabUid } from 'src/selectors/tab';
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
  const tabs = useSelector(selectTabs);
  const activeTabUid = useSelector(selectActiveTabUid);
  const collections = useSelector(selectCollections);
  const globalEnvironments = useSelector((state) => state.globalEnvironments?.globalEnvironments);
  const activeGlobalEnvironmentUid = useSelector(
    (state) => state.globalEnvironments?.activeGlobalEnvironmentUid
  );

  const everActiveRef = useRef(new Set());

  const appTabs = useMemo(() => {
    const out = [];
    let globals = null;
    const mergedByUid = new Map();
    const withGlobals = (collection) => {
      if (!mergedByUid.has(collection.uid)) {
        if (!globals) {
          globals = {
            globalEnvironmentVariables: getGlobalEnvironmentVariables({ globalEnvironments, activeGlobalEnvironmentUid }),
            globalEnvSecrets: getGlobalEnvironmentVariablesMasked({ globalEnvironments, activeGlobalEnvironmentUid }),
            globalEnvironments,
            activeGlobalEnvironmentUid
          };
        }
        mergedByUid.set(collection.uid, { ...collection, ...globals });
      }
      return mergedByUid.get(collection.uid);
    };

    for (const tab of tabs) {
      if (tab.type && !APP_CAPABLE_TAB_TYPES.has(tab.type)) continue;
      const collection = findCollectionByUid(collections, tab.collectionUid);
      // File-mode collections render everything through FileEditor.
      if (!collection || collection.fileMode) continue;
      let item = findItemInCollection(collection, tab.uid);
      if (!item && tab.pathname) {
        item = findItemInCollectionByPathname(collection, tab.pathname);
      }
      if (!item || item.partial || item.loading) continue;

      if (item.type === 'app') {
        out.push({ tabUid: tab.uid, collection: withGlobals(collection), item, kind: 'standalone' });
        continue;
      }

      const itemSource = item.draft ? item.draft : item;
      const appEnabled = get(itemSource, 'app.enabled', false) === true
        && tab.appPreview !== false;
      if (appEnabled) {
        const code = get(itemSource, 'app.code', '');
        out.push({ tabUid: tab.uid, collection: withGlobals(collection), item, kind: 'request', code });
      }
    }
    return out;
  }, [tabs, collections, globalEnvironments, activeGlobalEnvironmentUid]);

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
