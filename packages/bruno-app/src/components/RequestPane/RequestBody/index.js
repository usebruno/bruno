import React, { useState, useEffect } from 'react';
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
    // Check if bodyTabs exist in the saved request (restored from file)
    if (body?.bodyTabs && Array.isArray(body.bodyTabs) && body.bodyTabs.length > 0) {
      return body.bodyTabs;
    }

    // Fallback: create default tab from existing body content
    const effectiveBodyMode = bodyMode && RAW_BODY_MODES.includes(bodyMode) ? bodyMode : 'json';
    const initialContent = body && body[effectiveBodyMode] ? body[effectiveBodyMode] : '';

    return [
      {
        id: 1,
        name: 'Body 1',
        bodyContent: initialContent,
        bodyType: effectiveBodyMode,
      },
    ];
  };

  const [bodyTabs, setBodyTabs] = useState(() => initializeTabContent());
  const [activeBodyTab, setActiveBodyTab] = useState(() => {
    const tabs = initializeTabContent();
    return tabs[0]?.id || 1;
  });

  // Initialize tabs only once when component mounts or item changes
  useEffect(() => {
    const newTabs = initializeTabContent();
    setBodyTabs(newTabs);
    setActiveBodyTab(newTabs[0]?.id || 1);
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
  const saveBodyTabsToRedux = (tabs, modeOverride = bodyMode) => {
    if (modeOverride && RAW_BODY_MODES.includes(modeOverride)) {
      dispatch(updateRequestBodyTabs({
        bodyTabs: tabs,
        itemUid: item.uid,
        collectionUid: collection.uid,
      }));
    }
  };

  // Keep the active tab's bodyType in sync when the dropdown mode changes
  useEffect(() => {
    if (!bodyTabs || bodyTabs.length === 0) {
      return;
    }

    const activeTab = getActiveTab();
    if (!activeTab || !bodyMode || !RAW_BODY_MODES.includes(bodyMode)) {
      return;
    }

    if (activeTab.bodyType !== bodyMode) {
      const updatedTabs = bodyTabs.map(tab => {
        return tab.id === activeBodyTab ? { ...tab, bodyType: bodyMode } : tab;
      });
      setBodyTabs(updatedTabs);
      saveBodyTabsToRedux(updatedTabs, bodyMode);
    }
  }, [bodyMode, bodyTabs, activeBodyTab]);

  // When the active tab changes, ensure Redux reflects its mode and content
  useEffect(() => {
    if (!bodyTabs || bodyTabs.length === 0) {
      return;
    }

    const activeTab = getActiveTab();
    if (!activeTab) {
      return;
    }

    const bodyModeIsRaw = !bodyMode || bodyMode === 'none' || RAW_BODY_MODES.includes(bodyMode);
    const desiredMode
      = bodyModeIsRaw && activeTab.bodyType && RAW_BODY_MODES.includes(activeTab.bodyType)
        ? activeTab.bodyType
        : bodyMode;

    if (bodyModeIsRaw && desiredMode && desiredMode !== bodyMode && RAW_BODY_MODES.includes(desiredMode)) {
      dispatch(updateRequestBodyMode({
        itemUid: item.uid,
        collectionUid: collection.uid,
        mode: desiredMode,
      }));
    }

    const shouldSyncBodyContent
      = activeTab.bodyContent !== undefined && (bodyModeIsRaw || (desiredMode && RAW_BODY_MODES.includes(desiredMode)));

    if (shouldSyncBodyContent) {
      dispatch(updateRequestBody({
        content: activeTab.bodyContent || '',
        itemUid: item.uid,
        collectionUid: collection.uid,
      }));
    }
  }, [activeBodyTab, bodyTabs, bodyMode]);

  // Tab management functions
  const handleTabChange = tabId => {
    // Before switching tabs, ensure current tab's content is preserved
    const currentTab = getActiveTab();
    if (currentTab && currentTab.bodyContent !== undefined) {
      dispatch(updateRequestBody({
          content: currentTab.bodyContent || '',
        itemUid: item.uid,
          collectionUid: collection.uid,
        }));
    }
    setActiveBodyTab(tabId);
  };

  const handleAddTab = () => {
    const newTabId = Math.max(0, ...bodyTabs.map(tab => tab.id)) + 1;
    const newTab = {
      id: newTabId,
      name: `Body ${newTabId}`,
      bodyContent: '',
      bodyType: bodyMode || 'json',
    };
    const newTabs = [...bodyTabs, newTab];
    setBodyTabs(newTabs);
    setActiveBodyTab(newTabId);
    saveBodyTabsToRedux(newTabs, newTab.bodyType);
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
      saveBodyTabsToRedux([newBlankTab], newBlankTab.bodyType);
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
    saveBodyTabsToRedux(newTabs, tabForPersistence?.bodyType || bodyMode);
  };

  // Modified onEdit to update local tab content immediately and sync to Redux
  const onEdit = value => {
    const newTabs = bodyTabs.map(tab => (tab.id === activeBodyTab ? { ...tab, bodyContent: value } : tab));
    setBodyTabs(newTabs);
    const activeTab = newTabs.find(tab => tab.id === activeBodyTab);
    saveBodyTabsToRedux(newTabs, activeTab?.bodyType || bodyMode);

    // Also sync to Redux for real-time updates
    dispatch(
      updateRequestBody({
        content: value || '',
        itemUid: item.uid,
        collectionUid: collection.uid,
      }),
    );
  };

  // Enhanced onRun - always sync active tab content before running
  const onRun = () => {
    const currentActiveTab = bodyTabs.find(tab => tab.id === activeBodyTab);
    console.log('🚀 Running request with active tab:', currentActiveTab?.name);

    if (currentActiveTab) {
      const bodyModeIsRaw = !bodyMode || bodyMode === 'none' || RAW_BODY_MODES.includes(bodyMode);
      const desiredMode
        = bodyModeIsRaw && currentActiveTab.bodyType && RAW_BODY_MODES.includes(currentActiveTab.bodyType)
          ? currentActiveTab.bodyType
          : bodyMode;

      if (bodyModeIsRaw && desiredMode && desiredMode !== bodyMode && RAW_BODY_MODES.includes(desiredMode)) {
        dispatch(updateRequestBodyMode({
          itemUid: item.uid,
          collectionUid: collection.uid,
          mode: desiredMode,
        }));
      }

      const shouldSyncBodyContent
        = currentActiveTab.bodyContent !== undefined
          && (bodyModeIsRaw || (desiredMode && RAW_BODY_MODES.includes(desiredMode)));

      if (shouldSyncBodyContent) {
        dispatch(updateRequestBody({
          content: currentActiveTab.bodyContent || '',
          itemUid: item.uid,
            collectionUid: collection.uid,
        }));
      }

      saveBodyTabsToRedux(bodyTabs, desiredMode);
    }

    dispatch(sendRequest(item, collection.uid));
  };

  // Enhanced onSave - sync active tab content before saving
  const onSave = () => {
    const currentActiveTab = bodyTabs.find(tab => tab.id === activeBodyTab);
    console.log('💾 Saving request with active tab:', currentActiveTab?.name);

    if (currentActiveTab) {
      const bodyModeIsRaw = !bodyMode || bodyMode === 'none' || RAW_BODY_MODES.includes(bodyMode);
      const desiredMode
        = bodyModeIsRaw && currentActiveTab.bodyType && RAW_BODY_MODES.includes(currentActiveTab.bodyType)
          ? currentActiveTab.bodyType
          : bodyMode;

      if (bodyModeIsRaw && desiredMode && desiredMode !== bodyMode && RAW_BODY_MODES.includes(desiredMode)) {
        dispatch(updateRequestBodyMode({
          itemUid: item.uid,
            collectionUid: collection.uid,
            mode: desiredMode,
        }));
      }

      const shouldSyncBodyContent
        = currentActiveTab.bodyContent !== undefined
          && (bodyModeIsRaw || (desiredMode && RAW_BODY_MODES.includes(desiredMode)));

      if (shouldSyncBodyContent) {
        dispatch(updateRequestBody({
          content: currentActiveTab.bodyContent || '',
          itemUid: item.uid,
          collectionUid: collection.uid,
        }));
      }

      saveBodyTabsToRedux(bodyTabs, desiredMode);
    }

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
