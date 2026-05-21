import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { IconChevronDown, IconChevronRight } from '@tabler/icons';
import Method from './Common/Method/index';
import Status from './Common/Status/index';
import { RelativeTime } from './Common/Time/index';
import Network from './Network/index';
import Request from './Request/index';
import Response from './Response/index';
import StyledWrapper from './StyledWrapper';
import { usePersistedState } from 'hooks/usePersistedState/index';
import { flattenItems } from 'utils/collections/index';
import { getRelativePath } from 'utils/common/path';
import { addTab, updateRequestPaneTab, updateScriptPaneTab } from 'providers/ReduxStore/slices/tabs';
import { updateSettingsSelectedTab, updatedFolderSettingsSelectedTab } from 'providers/ReduxStore/slices/collections';
import { getBadge } from '../entryMeta';

// scope.sourceFile is a posix-relative path (e.g. "subdir/folder.bru"); match
// against each folder's relative path so Windows backslashes don't matter.
const findFolderByScopeFile = (collection, sourceFile) => {
  if (!collection?.pathname || !sourceFile) return null;
  const dir = sourceFile.replace(/\/folder\.(?:bru|yml)$/, '');
  if (!dir || dir === sourceFile) return null;
  return flattenItems(collection.items || []).find(
    (i) => i.type === 'folder' && getRelativePath(collection.pathname, i.pathname) === dir
  ) || null;
};

const TimelineItem = ({
  timestamp,
  request,
  response,
  item,
  collection,
  isOauth2,
  hideTimestamp = false,
  source,
  scope,
  phase
}) => {
  const dispatch = useDispatch();
  const [isExpanded, _toggleExpand] = usePersistedState({
    key: `timeline-${timestamp}`,
    default: false
  });
  const [activeTab, setActiveTab] = useState('request');
  // CodeMirror reads its size on mount and stays blank if hidden — lazy-mount
  // each tab on first visit and keep it mounted, toggling display only.
  const [visitedTabs, setVisitedTabs] = useState({ request: true });
  const toggleExpand = () => _toggleExpand((prev) => !prev);

  useEffect(() => {
    if (isExpanded) setVisitedTabs({ [activeTab]: true });
  }, [isExpanded]);

  const handleTabClick = (id) => {
    setActiveTab(id);
    setVisitedTabs((v) => (v[id] ? v : { ...v, [id]: true }));
  };

  const { method, url = '' } = request || {};
  // Main-request entries use `status`; scripted entries use `statusCode`.
  const { status, statusCode } = response || {};
  const code = statusCode ?? status;
  const showNetworkLogs = response?.timeline && response.timeline.length > 0;
  const badge = getBadge({ source, isOauth2 });

  const isMainOrOauth = !source || source === 'main' || isOauth2;
  const scopeType = scope?.type || (isMainOrOauth ? null : 'request');
  const scopeFile = scope?.sourceFile
    || (scopeType === 'request' ? (item?.filename || (item?.name ? `${item.name}.bru` : null)) : null);
  const sourceFile = isMainOrOauth ? null : scopeFile;

  const folderForScope = scopeType === 'folder'
    ? findFolderByScopeFile(collection, scope?.sourceFile)
    : null;
  const navTarget = (() => {
    if (!collection?.uid) return null;
    if (scopeType === 'collection') return { kind: 'collection' };
    if (scopeType === 'folder' && folderForScope?.uid) return { kind: 'folder', uid: folderForScope.uid };
    if (scopeType === 'request' && item?.uid) return { kind: 'request', uid: item.uid };
    return null;
  })();
  const canNavigate = !!navTarget;
  const handleNavigate = (ev) => {
    ev?.preventDefault?.();
    ev?.stopPropagation?.();
    if (!navTarget) return;
    // Collection settings expect tab 'tests' (plural); folder settings expect 'test' (singular).
    const isTestsPhase = phase === 'tests';
    const scriptPaneTab = phase || 'pre-request';
    if (navTarget.kind === 'collection') {
      dispatch(addTab({ uid: collection.uid, collectionUid: collection.uid, type: 'collection-settings' }));
      if (isTestsPhase) {
        dispatch(updateSettingsSelectedTab({ collectionUid: collection.uid, tab: 'tests' }));
      } else {
        dispatch(updateSettingsSelectedTab({ collectionUid: collection.uid, tab: 'script' }));
        dispatch(updateScriptPaneTab({ uid: collection.uid, scriptPaneTab }));
      }
    } else if (navTarget.kind === 'folder') {
      dispatch(addTab({ uid: navTarget.uid, collectionUid: collection.uid, type: 'folder-settings' }));
      if (isTestsPhase) {
        dispatch(updatedFolderSettingsSelectedTab({ collectionUid: collection.uid, folderUid: navTarget.uid, tab: 'test' }));
      } else {
        dispatch(updatedFolderSettingsSelectedTab({ collectionUid: collection.uid, folderUid: navTarget.uid, tab: 'script' }));
        dispatch(updateScriptPaneTab({ uid: navTarget.uid, scriptPaneTab }));
      }
    } else if (navTarget.kind === 'request') {
      dispatch(addTab({ uid: navTarget.uid, collectionUid: collection.uid, type: 'request' }));
      if (isTestsPhase) {
        dispatch(updateRequestPaneTab({ uid: navTarget.uid, requestPaneTab: 'tests' }));
      } else {
        dispatch(updateRequestPaneTab({ uid: navTarget.uid, requestPaneTab: 'script' }));
        dispatch(updateScriptPaneTab({ uid: navTarget.uid, scriptPaneTab }));
      }
    }
  };

  const tabs = [
    { id: 'request', label: 'Request' },
    { id: 'response', label: 'Response' },
    ...(showNetworkLogs ? [{ id: 'network', label: 'Network' }] : [])
  ];

  return (
    <StyledWrapper>
      <div className={`tl-row-wrap ${isOauth2 ? 'tl-row-wrap--oauth2' : ''}`}>
        <div className={`tl-row ${isExpanded ? 'is-expanded' : ''}`} onClick={toggleExpand}>
          <div className="tl-col-chev">
            {isExpanded ? <IconChevronDown size={14} strokeWidth={2} /> : <IconChevronRight size={14} strokeWidth={2} />}
          </div>
          <div className="tl-col-status">
            <Status statusCode={code} />
          </div>
          <div className="tl-col-method">
            <Method method={method} />
          </div>
          <div className="tl-col-url" title={url}>{url}</div>
          <div className="tl-col-badge">
            <span className={badge.badgeClass}>{badge.badgeLabel}</span>
          </div>
          {!hideTimestamp && (
            <div className="tl-col-time">
              <RelativeTime timestamp={timestamp} />
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="tl-detail">
            <div className="tl-header">
              <div className="tl-header-url" title={`${method || ''} ${url}`}>
                <span className="tl-header-url-method">{method}</span>
                <span className="tl-header-url-text">{url}</span>
              </div>
              {sourceFile && (
                <a
                  className={`tl-header-src${canNavigate ? '' : ' is-disabled'}`}
                  href="#"
                  title={canNavigate ? `Open ${sourceFile}` : sourceFile}
                  onClick={canNavigate ? handleNavigate : (ev) => ev.preventDefault()}
                >
                  <span className="tl-header-src-file">{sourceFile}</span>
                  <span className="tl-header-src-icon">↗</span>
                </a>
              )}
            </div>

            <div className="tl-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`tl-tab ${activeTab === tab.id ? 'is-active' : ''}`}
                  onClick={() => handleTabClick(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="tl-panel">
              {visitedTabs.request && (
                <div style={{ display: activeTab === 'request' ? 'block' : 'none' }}>
                  <Request request={request} item={item} collection={collection} />
                </div>
              )}
              {visitedTabs.response && (
                <div style={{ display: activeTab === 'response' ? 'block' : 'none' }}>
                  <Response response={response} item={item} collection={collection} />
                </div>
              )}
              {showNetworkLogs && visitedTabs.network && (
                <div style={{ display: activeTab === 'network' ? 'block' : 'none' }}>
                  <Network logs={response?.timeline} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </StyledWrapper>
  );
};

export default TimelineItem;
