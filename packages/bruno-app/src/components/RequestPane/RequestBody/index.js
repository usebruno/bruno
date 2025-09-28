import React, { useState, useEffect, useRef } from 'react';
import get from 'lodash/get';
import CodeEditor from 'components/CodeEditor';
import FormUrlEncodedParams from 'components/RequestPane/FormUrlEncodedParams';
import MultipartFormParams from 'components/RequestPane/MultipartFormParams';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import {
  updateRequestBody,
  updateRequestBodyMode,
  updateRequestBodyTabs,
} from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import FileBody from '../FileBody/index';
import BodyTabs from './BodyTabs';

const RAW_BODY_MODES = ['json', 'xml', 'text', 'sparql'];

const RequestBody = ({ item, collection }) => {
  const dispatch = useDispatch();
  const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');
  const bodyMode = item.draft ? get(item, 'draft.request.body.mode') : get(item, 'request.body.mode');
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  // Initialize tabs from saved data or create default tab
  const initializeTabContent = () => {
    if (body?.bodyTabs && Array.isArray(body.bodyTabs) && body.bodyTabs.length > 0) {
      return body.bodyTabs.map((tab, index) => {
        const fallbackMode = bodyMode && RAW_BODY_MODES.includes(bodyMode) ? bodyMode : 'json';
        const safeBodyType = RAW_BODY_MODES.includes(tab.bodyType) ? tab.bodyType : fallbackMode;

        return {
          id: typeof tab.id === 'number' ? tab.id : index + 1,
          name: tab.name || `Body ${index + 1}`,
          bodyContent: tab.bodyContent ?? '',
          bodyType: safeBodyType,
        };
      });
    }

    const fallbackMode = bodyMode && RAW_BODY_MODES.includes(bodyMode) ? bodyMode : 'json';
    const initialContent = body && body[fallbackMode] ? body[fallbackMode] : '';

    return [
      {
        id: 1,
        name: 'Body 1',
        bodyContent: initialContent,
        bodyType: fallbackMode,
      },
    ];
  };

  const [bodyTabs, setBodyTabs] = useState(() => initializeTabContent());
  const [activeBodyTab, setActiveBodyTab] = useState(() => {
    const tabs = initializeTabContent();
    return tabs[0]?.id || 1;
  });

  const modeSyncSuppressedRef = useRef(false);
  const lastSyncedTabIdRef = useRef(null);
  const lastSyncedContentRef = useRef('');

  // Initialize tabs only once when component mounts or item changes
  useEffect(() => {
    const newTabs = initializeTabContent();
    setBodyTabs(newTabs);
    const initialTabId = newTabs[0]?.id || 1;
    setActiveBodyTab(initialTabId);
    modeSyncSuppressedRef.current = false;
    lastSyncedTabIdRef.current = initialTabId;
    lastSyncedContentRef.current = newTabs.find(tab => tab.id === initialTabId)?.bodyContent ?? '';
  }, [item.uid]);

  // Get the currently active tab
  const getActiveTab = () => {
    const activeTab = bodyTabs.find(tab => tab.id === activeBodyTab);
    if (!activeTab) {
      console.warn(`Active tab with id ${activeBodyTab} not found, falling back to first tab`);
      return bodyTabs[0];
    }
    return activeTab;
  };

  // Save bodyTabs to Redux for persistence
  const saveBodyTabsToRedux = tabs => {
    if (!Array.isArray(tabs)) {
      return;
    }

    const sanitizedTabs = tabs.map((tab, index) => ({
      id: typeof tab.id === 'number' ? tab.id : index + 1,
      name: tab.name || `Body ${index + 1}`,
      bodyType: RAW_BODY_MODES.includes(tab.bodyType)
        ? tab.bodyType
        : RAW_BODY_MODES.includes(bodyMode)
          ? bodyMode
          : 'json',
      bodyContent: tab.bodyContent ?? '',
    }));

    dispatch(updateRequestBodyTabs({
      bodyTabs: sanitizedTabs,
      itemUid: item.uid,
      collectionUid: collection.uid,
    }));
  };

  // Keep the active tab's bodyType in sync when the dropdown mode changes
  useEffect(() => {
    if (!bodyTabs || bodyTabs.length === 0) {
      return;
    }

    if (!bodyMode || !RAW_BODY_MODES.includes(bodyMode)) {
      return;
    }

    const activeTab = getActiveTab();
    if (!activeTab || activeTab.bodyType === bodyMode) {
      return;
    }

    modeSyncSuppressedRef.current = true;

    const updatedTabs = bodyTabs.map(tab => (tab.id === activeBodyTab ? { ...tab, bodyType: bodyMode } : tab));

    setBodyTabs(updatedTabs);
    saveBodyTabsToRedux(updatedTabs);
  }, [bodyMode, activeBodyTab, bodyTabs]);

  // When the active tab changes, ensure Redux reflects its mode and content
  useEffect(() => {
    if (!bodyTabs || bodyTabs.length === 0) {
      return;
    }

    const activeTab = getActiveTab();
    if (!activeTab) {
      return;
    }

    const activeTabMode = activeTab.bodyType && RAW_BODY_MODES.includes(activeTab.bodyType) ? activeTab.bodyType : null;

    const bodyModeIsRaw = bodyMode && RAW_BODY_MODES.includes(bodyMode);

    if (activeTabMode && bodyModeIsRaw && bodyMode !== activeTabMode) {
      if (modeSyncSuppressedRef.current) {
        modeSyncSuppressedRef.current = false;
      } else {
        dispatch(updateRequestBodyMode({
          itemUid: item.uid,
          collectionUid: collection.uid,
          mode: activeTabMode,
        }));
      }
    } else {
      modeSyncSuppressedRef.current = false;
    }

    if (activeTab.bodyContent !== undefined) {
      const content = activeTab.bodyContent || '';

      if (lastSyncedTabIdRef.current !== activeTab.id || lastSyncedContentRef.current !== content) {
        dispatch(updateRequestBody({
          content,
          itemUid: item.uid,
          collectionUid: collection.uid,
        }));

        lastSyncedTabIdRef.current = activeTab.id;
        lastSyncedContentRef.current = content;
      }
    }
  }, [activeBodyTab, bodyTabs, bodyMode, collection.uid, dispatch, item.uid]);

  // Tab management functions
  const handleTabChange = tabId => {
    const currentTab = getActiveTab();
    if (currentTab && currentTab.bodyContent !== undefined) {
      const content = currentTab.bodyContent || '';
      dispatch(updateRequestBody({
        content,
        itemUid: item.uid,
        collectionUid: collection.uid,
      }));
      lastSyncedTabIdRef.current = currentTab.id;
      lastSyncedContentRef.current = content;
    }

    setActiveBodyTab(tabId);
  };

  const handleAddTab = () => {
    const newTabId = Math.max(0, ...bodyTabs.map(tab => tab.id)) + 1;
    const fallbackMode = bodyMode && RAW_BODY_MODES.includes(bodyMode) ? bodyMode : 'json';
    const newTab = {
      id: newTabId,
      name: `Body ${newTabId}`,
      bodyContent: '',
      bodyType: fallbackMode,
    };

    const newTabs = [...bodyTabs, newTab];
    setBodyTabs(newTabs);
    setActiveBodyTab(newTabId);
    saveBodyTabsToRedux(newTabs);
  };

  const handleTabRename = (tabId, newName) => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;

    // Check for duplicates and append number if needed
    const existingNames = bodyTabs.filter(tab => tab.id !== tabId).map(tab => tab.name);
    let finalName = trimmedName;
    let counter = 1;

    while (existingNames.includes(finalName)) {
      counter++;
      finalName = `${trimmedName} ${counter}`;
    }
    const newTabs = bodyTabs.map(tab => (tab.id === tabId ? { ...tab, name: finalName } : tab));
    setBodyTabs(newTabs);
    saveBodyTabsToRedux(newTabs);
  };

  const handleTabClose = tabId => {
    const tabIndex = bodyTabs.findIndex(tab => tab.id === tabId);
    const isClosingActiveTab = tabId === activeBodyTab;

    // If this is the last tab, create a new blank tab before closing
    if (bodyTabs.length === 1) {
      const newBlankTab = {
        id: Math.max(0, ...bodyTabs.map(tab => tab.id)) + 1,
        name: 'Body 1',
        bodyContent: '',
        bodyType: bodyMode || 'json',
      };
      setBodyTabs([newBlankTab]);
      setActiveBodyTab(newBlankTab.id);
      saveBodyTabsToRedux([newBlankTab]);
      return;
    }

    // Remove the tab
    const newTabs = bodyTabs.filter(tab => tab.id !== tabId);

    // Determine which tab should remain active after the close
    const tabForPersistence = (() => {
      if (isClosingActiveTab) {
        return tabIndex > 0 ? newTabs[tabIndex - 1] : newTabs[0];
      }
      return newTabs.find(tab => tab.id === activeBodyTab) || newTabs[0];
    })();

    if (isClosingActiveTab && tabForPersistence) {
      setActiveBodyTab(tabForPersistence.id);
    }

    setBodyTabs(newTabs);
    saveBodyTabsToRedux(newTabs);
  };

  // Modified onEdit to update local tab content immediately and sync to Redux
  const onEdit = value => {
    const newTabs = bodyTabs.map(tab => (tab.id === activeBodyTab ? { ...tab, bodyContent: value } : tab));
    setBodyTabs(newTabs);
    saveBodyTabsToRedux(newTabs);

    const content = value || '';
    lastSyncedTabIdRef.current = activeBodyTab;
    lastSyncedContentRef.current = content;

    // Also sync to Redux for real-time updates
    dispatch(
      updateRequestBody({
        content,
        itemUid: item.uid,
        collectionUid: collection.uid,
      }),
    );
  };

  const syncActiveTabBeforeAction = () => {
    const currentActiveTab = bodyTabs.find(tab => tab.id === activeBodyTab);
    if (!currentActiveTab) {
      return null;
    }

    const activeTabMode
      = currentActiveTab.bodyType && RAW_BODY_MODES.includes(currentActiveTab.bodyType)
        ? currentActiveTab.bodyType
        : null;

    if (activeTabMode && bodyMode !== activeTabMode) {
      dispatch(updateRequestBodyMode({
        itemUid: item.uid,
        collectionUid: collection.uid,
        mode: activeTabMode,
      }));
    }

    if (currentActiveTab.bodyContent !== undefined) {
      const content = currentActiveTab.bodyContent || '';
      dispatch(updateRequestBody({
        content,
        itemUid: item.uid,
        collectionUid: collection.uid,
      }));

      lastSyncedTabIdRef.current = currentActiveTab.id;
      lastSyncedContentRef.current = content;
    }

    saveBodyTabsToRedux(bodyTabs);

    return currentActiveTab;
  };

  const onRun = () => {
    const currentActiveTab = syncActiveTabBeforeAction();
    dispatch(sendRequest(item, collection.uid));
  };

  const onSave = () => {
    const currentActiveTab = syncActiveTabBeforeAction();
    dispatch(saveRequest(item.uid, collection.uid));
  };

  // Render tabbed interface for raw body types or when no body mode is set
  if (!bodyMode || bodyMode === 'none' || RAW_BODY_MODES.includes(bodyMode)) {
    const activeTab = getActiveTab();
    const effectiveBodyMode = bodyMode && bodyMode !== 'none' ? bodyMode : activeTab?.bodyType || 'json';

    const codeMirrorMode = {
      json: 'application/ld+json',
      text: 'application/text',
      xml: 'application/xml',
      sparql: 'application/sparql-query',
    };

    return (
      <StyledWrapper className="w-full">
        {bodyMode === 'none' || !bodyMode ? (
          <div className="text-center py-8 text-gray-500">
            Select a body type from the dropdown above to start adding content.
          </div>
        ) : (
          <BodyTabs
            tabs={bodyTabs.map(tab => ({ id: tab.id, title: tab.name }))}
            activeTabId={activeBodyTab}
            onTabChange={handleTabChange}
            onAddTab={handleAddTab}
            onTabRename={handleTabRename}
            onTabClose={handleTabClose}
          >
            <CodeEditor
              collection={collection}
              item={item}
              theme={displayedTheme}
              font={get(preferences, 'font.codeFont', 'default')}
              fontSize={get(preferences, 'font.codeFontSize')}
              value={activeTab?.bodyContent || ''}
              onEdit={onEdit}
              onRun={onRun}
              onSave={onSave}
              mode={codeMirrorMode[effectiveBodyMode] || codeMirrorMode.json}
              enableVariableHighlighting={true}
              showHintsFor={['variables']}
            />
          </BodyTabs>
        )}
      </StyledWrapper>
    );
  }

  if (bodyMode === 'file') {
    return (
      <StyledWrapper className="w-full">
        <FileBody item={item} collection={collection} />
      </StyledWrapper>
    );
  }

  if (bodyMode === 'formUrlEncoded') {
    return <FormUrlEncodedParams item={item} collection={collection} />;
  }

  if (bodyMode === 'multipartForm') {
    return <MultipartFormParams item={item} collection={collection} />;
  }

  return <StyledWrapper className="w-full">No Body</StyledWrapper>;
};

export default RequestBody;
