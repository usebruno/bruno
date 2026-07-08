import { useDispatch } from 'react-redux';
import { getTreePathFromCollectionToItem } from 'utils/collections/index';
import {
  addTab,
  updateRequestPaneTab,
  updateScriptPaneTab,
  setFocusErrorLine,
  setFocusHeaderRow
} from 'providers/ReduxStore/slices/tabs';
import { updateSettingsSelectedTab, updatedFolderSettingsSelectedTab } from 'providers/ReduxStore/slices/collections';
import { buildHeaderSections } from '@usebruno/common/utils';
import BodyBlock from '../Common/Body/index';
import Headers from '../Common/Headers/index';

const safeStringifyJSONIfNotString = (obj) => {
  if (obj === null || obj === undefined) return '';
  if (typeof obj === 'string') return obj;
  try {
    return JSON.stringify(obj);
  } catch (e) {
    return '[Unserializable Object]';
  }
};

const Request = ({ collection, request, item, timeline }) => {
  const dispatch = useDispatch();
  let { headers, data, dataBuffer, error } = request || {};
  if (!dataBuffer) {
    dataBuffer = Buffer.from(safeStringifyJSONIfNotString(data))?.toString('base64');
  }

  const treePath = getTreePathFromCollectionToItem(collection, item);
  const headerSections = buildHeaderSections({ collection, item, treePath, request, timeline });

  // Open (mounting if needed) the tab/sub-tab where this header comes from, then flash the row/line.
  const handleNavigate = (nav) => {
    if (!nav || !collection?.uid) return;
    const requestedAt = Date.now();

    if (nav.kind === 'collection') {
      dispatch(addTab({ uid: collection.uid, collectionUid: collection.uid, type: 'collection-settings' }));
      dispatch(updateSettingsSelectedTab({ collectionUid: collection.uid, tab: 'headers' }));
      if (nav.headerUid) dispatch(setFocusHeaderRow({ uid: collection.uid, tableId: 'collection-headers', headerUid: nav.headerUid, requestedAt }));
    } else if (nav.kind === 'folder' && nav.folderUid) {
      dispatch(addTab({ uid: nav.folderUid, collectionUid: collection.uid, type: 'folder-settings' }));
      dispatch(updatedFolderSettingsSelectedTab({ collectionUid: collection.uid, folderUid: nav.folderUid, tab: 'headers' }));
      if (nav.headerUid) dispatch(setFocusHeaderRow({ uid: nav.folderUid, tableId: 'folder-headers', headerUid: nav.headerUid, requestedAt }));
    } else if (nav.kind === 'request' && item?.uid) {
      dispatch(addTab({ uid: item.uid, collectionUid: collection.uid, type: 'request' }));
      dispatch(updateRequestPaneTab({ uid: item.uid, requestPaneTab: 'headers' }));
      if (nav.headerUid) dispatch(setFocusHeaderRow({ uid: item.uid, tableId: 'request-headers', headerUid: nav.headerUid, requestedAt }));
    } else if (nav.kind === 'script') {
      const line = nav.line || 1;
      const focus = (uid) => dispatch(setFocusErrorLine({ uid, scriptPhase: 'pre-request', line, variant: 'info', requestedAt }));
      if (nav.level === 'collection') {
        dispatch(addTab({ uid: collection.uid, collectionUid: collection.uid, type: 'collection-settings' }));
        dispatch(updateSettingsSelectedTab({ collectionUid: collection.uid, tab: 'script' }));
        dispatch(updateScriptPaneTab({ uid: collection.uid, scriptPaneTab: 'pre-request' }));
        focus(collection.uid);
      } else if (nav.level === 'folder' && nav.folderUid) {
        dispatch(addTab({ uid: nav.folderUid, collectionUid: collection.uid, type: 'folder-settings' }));
        dispatch(updatedFolderSettingsSelectedTab({ collectionUid: collection.uid, folderUid: nav.folderUid, tab: 'script' }));
        dispatch(updateScriptPaneTab({ uid: nav.folderUid, scriptPaneTab: 'pre-request' }));
        focus(nav.folderUid);
      } else if (item?.uid) {
        dispatch(addTab({ uid: item.uid, collectionUid: collection.uid, type: 'request' }));
        dispatch(updateRequestPaneTab({ uid: item.uid, requestPaneTab: 'script' }));
        dispatch(updateScriptPaneTab({ uid: item.uid, scriptPaneTab: 'pre-request' }));
        focus(item.uid);
      }
    }
  };

  return (
    <>
      <Headers sections={headerSections} onNavigate={handleNavigate} />
      <BodyBlock
        collection={collection}
        data={data}
        dataBuffer={dataBuffer}
        error={error}
        headers={headers}
        item={item}
        type="request"
      />
    </>
  );
};

export default Request;
