import React, { useState, useEffect, useRef, useMemo } from 'react';
import get from 'lodash/get';
import find from 'lodash/find';
import { debounce } from 'lodash';
import CodeEditor from 'components/CodeEditor';
import FormUrlEncodedParams from 'components/RequestPane/FormUrlEncodedParams';
import MultipartFormParams from 'components/RequestPane/MultipartFormParams';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import {
  updateRequestBody,
  updateRequestBodyMode,
  updateRequestBodyTabs
} from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { updateRequestBodyScrollPosition } from 'providers/ReduxStore/slices/tabs';
import StyledWrapper from './StyledWrapper';
import FileBody from '../FileBody/index';
import BodyTabs from './BodyTabs';

const RAW_BODY_MODES = ['json', 'xml', 'text', 'sparql'];

const getNextTabName = (existingTabs) => {
  const names = new Set(existingTabs.map((t) => t.name));
  let n = 1;
  while (names.has(`Body ${n}`)) n++;
  return `Body ${n}`;
};

const RequestBody = ({ item, collection }) => {
  const dispatch = useDispatch();
  const body = item.draft ? get(item, 'draft.request.body') : get(item, 'request.body');
  const bodyMode = item.draft ? get(item, 'draft.request.body.mode') : get(item, 'request.body.mode');
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);

  const initializeTabContent = () => {
    if (body?.bodyTabs && Array.isArray(body.bodyTabs) && body.bodyTabs.length > 0) {
      return body.bodyTabs.map((tab, index) => {
        const fallbackMode = bodyMode && RAW_BODY_MODES.includes(bodyMode) ? bodyMode : 'json';
        const safeBodyType = RAW_BODY_MODES.includes(tab.bodyType) ? tab.bodyType : fallbackMode;

        return {
          id: typeof tab.id === 'number' ? tab.id : index + 1,
          name: tab.name || `Body ${index + 1}`,
          bodyContent: tab.bodyContent ?? '',
          bodyType: safeBodyType
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
        bodyType: fallbackMode
      }
    ];
  };

  const initialTabs = useMemo(() => initializeTabContent(), []);
  const [bodyTabs, setBodyTabs] = useState(initialTabs);
  const [activeBodyTab, setActiveBodyTab] = useState(initialTabs[0]?.id || 1);

  const lastChangeSourceRef = useRef(null);
  const lastSyncedTabIdRef = useRef(null);
  const lastSyncedContentRef = useRef('');

  useEffect(() => {
    const newTabs = initializeTabContent();
    setBodyTabs(newTabs);
    const initialTabId = newTabs[0]?.id || 1;
    setActiveBodyTab(initialTabId);
    lastChangeSourceRef.current = null;
    lastSyncedTabIdRef.current = initialTabId;
    lastSyncedContentRef.current = newTabs.find((tab) => tab.id === initialTabId)?.bodyContent ?? '';
  }, [item.uid]);

  const getActiveTab = () => {
    const activeTab = bodyTabs.find((tab) => tab.id === activeBodyTab);
    if (!activeTab) {
      return bodyTabs.length > 0 ? bodyTabs[0] : null;
    }
    return activeTab;
  };

  const saveBodyTabsToRedux = (tabs) => {
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
      bodyContent: tab.bodyContent ?? ''
    }));

    dispatch(updateRequestBodyTabs({
      bodyTabs: sanitizedTabs,
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
  };

  const debouncedSaveBodyTabs = useMemo(
    () => debounce((tabs) => saveBodyTabsToRedux(tabs), 300),
    [item.uid, collection.uid]
  );

  useEffect(() => {
    return () => debouncedSaveBodyTabs.cancel();
  }, [debouncedSaveBodyTabs]);

  useEffect(() => {
    if (!bodyTabs?.length) return;
    const activeTab = getActiveTab();
    if (!activeTab) return;

    const activeTabMode = activeTab.bodyType && RAW_BODY_MODES.includes(activeTab.bodyType) ? activeTab.bodyType : null;
    const bodyModeIsRaw = bodyMode && RAW_BODY_MODES.includes(bodyMode);

    if (bodyModeIsRaw && activeTabMode && activeTab.bodyType !== bodyMode && lastChangeSourceRef.current !== 'tab-switch') {
      const updatedTabs = bodyTabs.map((tab) => tab.id === activeBodyTab ? { ...tab, bodyType: bodyMode } : tab);
      setBodyTabs(updatedTabs);
      saveBodyTabsToRedux(updatedTabs);
      lastChangeSourceRef.current = null;
      return;
    }

    if (activeTabMode && bodyModeIsRaw && bodyMode !== activeTabMode) {
      lastChangeSourceRef.current = 'tab-switch';
      dispatch(updateRequestBodyMode({
        itemUid: item.uid,
        collectionUid: collection.uid,
        mode: activeTabMode
      }));
    } else {
      lastChangeSourceRef.current = null;
    }

    if (activeTab.bodyContent !== undefined) {
      const content = activeTab.bodyContent || '';
      if (lastSyncedTabIdRef.current !== activeTab.id || lastSyncedContentRef.current !== content) {
        dispatch(updateRequestBody({
          content,
          itemUid: item.uid,
          collectionUid: collection.uid
        }));
        lastSyncedTabIdRef.current = activeTab.id;
        lastSyncedContentRef.current = content;
      }
    }
  }, [activeBodyTab, bodyTabs, bodyMode, collection.uid, dispatch, item.uid]);

  const handleTabChange = (tabId) => {
    const currentTab = getActiveTab();
    if (currentTab && currentTab.bodyContent !== undefined) {
      const content = currentTab.bodyContent || '';
      dispatch(updateRequestBody({
        content,
        itemUid: item.uid,
        collectionUid: collection.uid
      }));
      lastSyncedTabIdRef.current = currentTab.id;
      lastSyncedContentRef.current = content;
    }

    setActiveBodyTab(tabId);
  };

  const handleAddTab = () => {
    const newTabId = Math.max(0, ...bodyTabs.map((tab) => tab.id)) + 1;
    const fallbackMode = bodyMode && RAW_BODY_MODES.includes(bodyMode) ? bodyMode : 'json';
    const newTab = {
      id: newTabId,
      name: getNextTabName(bodyTabs),
      bodyContent: '',
      bodyType: fallbackMode
    };

    const newTabs = [...bodyTabs, newTab];
    setBodyTabs(newTabs);
    setActiveBodyTab(newTabId);
    saveBodyTabsToRedux(newTabs);
  };

  const handleTabRename = (tabId, newName) => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;

    const existingNames = bodyTabs.filter((tab) => tab.id !== tabId).map((tab) => tab.name);
    let finalName = trimmedName;
    let counter = 1;

    while (existingNames.includes(finalName)) {
      counter++;
      finalName = `${trimmedName} ${counter}`;
    }
    const newTabs = bodyTabs.map((tab) => (tab.id === tabId ? { ...tab, name: finalName } : tab));
    setBodyTabs(newTabs);
    saveBodyTabsToRedux(newTabs);
  };

  const handleTabClose = (tabId) => {
    const tabIndex = bodyTabs.findIndex((tab) => tab.id === tabId);
    const isClosingActiveTab = tabId === activeBodyTab;

    if (bodyTabs.length === 1) {
      const fallbackMode = bodyMode && RAW_BODY_MODES.includes(bodyMode) ? bodyMode : 'json';
      const newBlankTab = {
        id: Math.max(0, ...bodyTabs.map((tab) => tab.id)) + 1,
        name: getNextTabName([]),
        bodyContent: '',
        bodyType: fallbackMode
      };
      setBodyTabs([newBlankTab]);
      setActiveBodyTab(newBlankTab.id);
      saveBodyTabsToRedux([newBlankTab]);
      return;
    }

    const newTabs = bodyTabs.filter((tab) => tab.id !== tabId);

    const tabForPersistence = (() => {
      if (isClosingActiveTab) {
        return tabIndex > 0 ? newTabs[tabIndex - 1] : newTabs[0];
      }
      return newTabs.find((tab) => tab.id === activeBodyTab) || newTabs[0];
    })();

    if (isClosingActiveTab && tabForPersistence) {
      setActiveBodyTab(tabForPersistence.id);
    }

    setBodyTabs(newTabs);
    saveBodyTabsToRedux(newTabs);
  };

  const handleReorderTab = (dragId, hoverId) => {
    const dragIndex = bodyTabs.findIndex((tab) => tab.id === dragId);
    const hoverIndex = bodyTabs.findIndex((tab) => tab.id === hoverId);
    if (dragIndex === -1 || hoverIndex === -1 || dragIndex === hoverIndex) return;

    const reordered = [...bodyTabs];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(hoverIndex, 0, moved);
    setBodyTabs(reordered);
    saveBodyTabsToRedux(reordered);
  };

  const handleDuplicateTab = (tabId) => {
    const tabToDuplicate = bodyTabs.find((tab) => tab.id === tabId);
    if (!tabToDuplicate) return;

    const newTabId = Math.max(0, ...bodyTabs.map((tab) => tab.id)) + 1;
    let copyName = `${tabToDuplicate.name} (copy)`;
    const existingNames = new Set(bodyTabs.map((t) => t.name));
    let counter = 1;
    while (existingNames.has(copyName)) {
      counter++;
      copyName = `${tabToDuplicate.name} (copy ${counter})`;
    }
    const newTab = {
      ...tabToDuplicate,
      id: newTabId,
      name: copyName
    };

    const insertIndex = bodyTabs.findIndex((tab) => tab.id === tabId) + 1;
    const newTabs = [...bodyTabs];
    newTabs.splice(insertIndex, 0, newTab);
    setBodyTabs(newTabs);
    setActiveBodyTab(newTabId);
    saveBodyTabsToRedux(newTabs);
  };

  const handleCloseOtherTabs = (tabId) => {
    const tabToKeep = bodyTabs.find((tab) => tab.id === tabId);
    if (!tabToKeep) return;

    setBodyTabs([tabToKeep]);
    setActiveBodyTab(tabToKeep.id);
    saveBodyTabsToRedux([tabToKeep]);
  };

  const onEdit = (value) => {
    const newTabs = bodyTabs.map((tab) => (tab.id === activeBodyTab ? { ...tab, bodyContent: value } : tab));
    setBodyTabs(newTabs);
    debouncedSaveBodyTabs(newTabs);

    const content = value || '';
    lastSyncedTabIdRef.current = activeBodyTab;
    lastSyncedContentRef.current = content;

    dispatch(
      updateRequestBody({
        content,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const syncActiveTabBeforeAction = () => {
    const currentActiveTab = bodyTabs.find((tab) => tab.id === activeBodyTab);
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
        mode: activeTabMode
      }));
    }

    if (currentActiveTab.bodyContent !== undefined) {
      const content = currentActiveTab.bodyContent || '';
      dispatch(updateRequestBody({
        content,
        itemUid: item.uid,
        collectionUid: collection.uid
      }));

      lastSyncedTabIdRef.current = currentActiveTab.id;
      lastSyncedContentRef.current = content;
    }

    saveBodyTabsToRedux(bodyTabs);

    return currentActiveTab;
  };

  const onRun = () => {
    syncActiveTabBeforeAction();
    dispatch(sendRequest(item, collection.uid));
  };

  const onSave = () => {
    syncActiveTabBeforeAction();
    dispatch(saveRequest(item.uid, collection.uid));
  };

  const onScroll = (editor) => {
    if (!focusedTab) return;
    dispatch(
      updateRequestBodyScrollPosition({
        uid: focusedTab.uid,
        scrollY: editor.doc.scrollTop
      })
    );
  };

  if (!bodyMode || bodyMode === 'none' || RAW_BODY_MODES.includes(bodyMode)) {
    const activeTab = getActiveTab();
    const effectiveBodyMode = bodyMode && bodyMode !== 'none' ? bodyMode : activeTab?.bodyType || 'json';

    const codeMirrorMode = {
      json: 'application/ld+json',
      text: 'application/text',
      xml: 'application/xml',
      sparql: 'application/sparql-query'
    };

    return (
      <StyledWrapper className="w-full" data-testid="request-body-editor">
        {bodyMode === 'none' || !bodyMode ? (
          <div className="text-center py-8 text-gray-500">
            Select a body type from the dropdown above to start adding content.
          </div>
        ) : (
          <BodyTabs
            tabs={bodyTabs.map((tab) => ({ id: tab.id, title: tab.name }))}
            activeTabId={activeBodyTab}
            onTabChange={handleTabChange}
            onAddTab={handleAddTab}
            onTabRename={handleTabRename}
            onTabClose={handleTabClose}
            onReorderTab={handleReorderTab}
            onDuplicateTab={handleDuplicateTab}
            onCloseOtherTabs={handleCloseOtherTabs}
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
              onScroll={onScroll}
              initialScroll={focusedTab?.requestBodyScrollPosition || 0}
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
