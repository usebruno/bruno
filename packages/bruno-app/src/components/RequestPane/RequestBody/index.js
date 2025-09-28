import React, { useState, useEffect } from 'react';
import get from 'lodash/get';
import find from 'lodash/find';
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
import { updateRequestBodyScrollPosition } from 'providers/ReduxStore/slices/tabs';
import StyledWrapper from './StyledWrapper';
import FileBody from '../FileBody/index';
import BodyTabs from './BodyTabs';

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
      return body.bodyTabs;
    }

    const effectiveBodyMode = bodyMode && ['json', 'xml', 'text', 'sparql'].includes(bodyMode) ? bodyMode : 'json';
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

  useEffect(() => {
    const newTabs = initializeTabContent();
    setBodyTabs(newTabs);
    setActiveBodyTab(newTabs[0]?.id || 1);
  }, [item.uid]);

  const getActiveTab = () => {
    const activeTab = bodyTabs.find(tab => tab.id === activeBodyTab);
    if (!activeTab) {
      console.warn(`Active tab with id ${activeBodyTab} not found, falling back to first tab`);
      return bodyTabs[0];
    }
    return activeTab;
  };

  const saveBodyTabsToRedux = tabs => {
    if (['json', 'xml', 'text', 'sparql'].includes(bodyMode)) {
      dispatch(updateRequestBodyTabs({
        bodyTabs: tabs,
        itemUid: item.uid,
        collectionUid: collection.uid,
      }));
    }
  };

  useEffect(() => {
    if (!bodyTabs || bodyTabs.length === 0) {
      return;
    }

    const activeTab = getActiveTab();
    if (!activeTab) {
      return;
    }

    if (bodyMode && ['json', 'xml', 'text', 'sparql'].includes(bodyMode)) {
      if (activeTab.bodyType !== bodyMode) {
        const newTabs = bodyTabs.map(tab => (tab.id === activeBodyTab ? { ...tab, bodyType: bodyMode } : tab));
        setBodyTabs(newTabs);
        setTimeout(() => saveBodyTabsToRedux(newTabs), 0);
      }
    }

    if (
      activeTab.bodyType
      && activeTab.bodyType !== bodyMode
      && ['json', 'xml', 'text', 'sparql'].includes(activeTab.bodyType)
    ) {
      dispatch(updateRequestBodyMode({
        itemUid: item.uid,
        collectionUid: collection.uid,
        mode: activeTab.bodyType,
      }));
    }
  }, [activeBodyTab, bodyMode, bodyTabs.length]);

  const handleTabChange = tabId => {
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
    const newTabId = Math.max(...bodyTabs.map(tab => tab.id)) + 1;
    const newTab = {
      id: newTabId,
      name: `Body ${newTabId}`,
      bodyContent: '',
      bodyType: bodyMode || 'json',
    };
    const newTabs = [...bodyTabs, newTab];
    setBodyTabs(newTabs);
    setActiveBodyTab(newTabId);
    saveBodyTabsToRedux(newTabs);
  };

  const handleTabRename = (tabId, newName) => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;

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

    if (bodyTabs.length === 1) {
      const newBlankTab = {
        id: Math.max(...bodyTabs.map(tab => tab.id)) + 1,
        name: 'Body 1',
        bodyContent: '',
        bodyType: bodyMode || 'json',
      };
      setBodyTabs([newBlankTab]);
      setActiveBodyTab(newBlankTab.id);
      saveBodyTabsToRedux([newBlankTab]);
      return;
    }

    const newTabs = bodyTabs.filter(tab => tab.id !== tabId);

    if (isClosingActiveTab) {
      let newActiveTab;
      if (tabIndex > 0) {
        newActiveTab = newTabs[tabIndex - 1];
      } else {
        newActiveTab = newTabs[0];
      }
      setActiveBodyTab(newActiveTab.id);
    }

    setBodyTabs(newTabs);
    saveBodyTabsToRedux(newTabs);
  };

  const onEdit = value => {
    const newTabs = bodyTabs.map(tab => (tab.id === activeBodyTab ? { ...tab, bodyContent: value } : tab));
    setBodyTabs(newTabs);
    saveBodyTabsToRedux(newTabs);

    dispatch(
      updateRequestBody({
        content: value || '',
        itemUid: item.uid,
        collectionUid: collection.uid,
      }),
    );
  };

  const onRun = () => {
    const currentActiveTab = bodyTabs.find(tab => tab.id === activeBodyTab);

    if (currentActiveTab && currentActiveTab.bodyContent !== undefined) {
      dispatch(updateRequestBody({
        content: currentActiveTab.bodyContent || '',
        itemUid: item.uid,
        collectionUid: collection.uid,
      }));

      if (currentActiveTab.bodyType !== bodyMode) {
        dispatch(updateRequestBodyMode({
          itemUid: item.uid,
          collectionUid: collection.uid,
          mode: currentActiveTab.bodyType,
        }));
      }
    }

    dispatch(sendRequest(item, collection.uid));
  };

  const onSave = () => {
    const currentActiveTab = bodyTabs.find(tab => tab.id === activeBodyTab);

    if (currentActiveTab && currentActiveTab.bodyContent !== undefined) {
      dispatch(updateRequestBody({
        content: currentActiveTab.bodyContent || '',
        itemUid: item.uid,
        collectionUid: collection.uid,
      }));

      if (currentActiveTab.bodyType !== bodyMode) {
        dispatch(updateRequestBodyMode({
          itemUid: item.uid,
          collectionUid: collection.uid,
          mode: currentActiveTab.bodyType,
        }));
      }
    }

    dispatch(saveRequest(item.uid, collection.uid));
  };

  const onScroll = (editor) => {
    dispatch(
      updateRequestBodyScrollPosition({
        uid: focusedTab.uid,
        scrollY: editor.doc.scrollTop
      })
    );
  };

  if (!bodyMode || bodyMode === 'none' || ['json', 'xml', 'text', 'sparql'].includes(bodyMode)) {
    const activeTab = getActiveTab();
    const effectiveBodyMode = bodyMode && bodyMode !== 'none' ? bodyMode : activeTab?.bodyType || 'json';

    const codeMirrorMode = {
      json: 'application/ld+json',
      text: 'application/text',
      xml: 'application/xml',
      sparql: 'application/sparql-query',
    };

    return (
      <StyledWrapper className="w-full" data-testid="request-body-editor">
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
