import React, { useEffect, useRef } from 'react';
import get from 'lodash/get';
import find from 'lodash/find';
import { useDispatch, useSelector } from 'react-redux';
import CodeEditor from 'components/CodeEditor';
import { updateFolderRequestScript, updateFolderResponseScript } from 'providers/ReduxStore/slices/collections';
import { saveFolderRoot } from 'providers/ReduxStore/slices/collections/actions';
import { updateScriptPaneTab } from 'providers/ReduxStore/slices/tabs';
import { useTheme } from 'providers/Theme';
import { Tabs, TabsList, TabsTrigger, TabsContent } from 'components/Tabs';
import StatusDot from 'components/StatusDot';
import { flattenItems, isItemARequest } from 'utils/collections';
import StyledWrapper from './StyledWrapper';
import Button from 'ui/Button';
import { usePersistedEditorScroll } from 'hooks/usePersistedState/usePersistedEditorScroll';

const Script = ({ collection, folder }) => {
  const dispatch = useDispatch();
  const preRequestEditorRef = useRef(null);
  const postResponseEditorRef = useRef(null);
  const requestScript = folder.draft ? get(folder, 'draft.request.script.req', '') : get(folder, 'root.request.script.req', '');
  const responseScript = folder.draft ? get(folder, 'draft.request.script.res', '') : get(folder, 'root.request.script.res', '');

  const tabs = useSelector((state) => state.tabs.tabs);
  const focusedTab = find(tabs, (t) => t.uid === folder.uid);
  const scriptPaneTab = focusedTab?.scriptPaneTab;

  // Default to post-response if pre-request script is empty (only when scriptPaneTab is null/undefined)
  const getDefaultTab = () => {
    const hasPreRequestScript = requestScript && requestScript.trim().length > 0;
    return hasPreRequestScript ? 'pre-request' : 'post-response';
  };

  const activeTab = scriptPaneTab || getDefaultTab();

  const setActiveTab = (tab) => {
    dispatch(updateScriptPaneTab({ uid: folder.uid, scriptPaneTab: tab }));
  };

  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  const preReqScroll = usePersistedEditorScroll(preRequestEditorRef, `folder-pre-req-scroll-${folder.uid}`);
  const postResScroll = usePersistedEditorScroll(postResponseEditorRef, `folder-post-res-scroll-${folder.uid}`);

  // Refresh CodeMirror when tab becomes visible and restore scroll position.
  // CodeMirror's scrollTo() is silently ignored when the editor is inside a display:none container
  // (TabsContent hides inactive tabs via display:none). After refresh() recalculates layout, we re-apply scrollTo().
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'pre-request' && preRequestEditorRef.current?.editor) {
        preRequestEditorRef.current.editor.refresh();
        preRequestEditorRef.current.editor.scrollTo(null, preReqScroll);
      } else if (activeTab === 'post-response' && postResponseEditorRef.current?.editor) {
        postResponseEditorRef.current.editor.refresh();
        postResponseEditorRef.current.editor.scrollTo(null, postResScroll);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [activeTab]);

  const onRequestScriptEdit = (value) => {
    dispatch(
      updateFolderRequestScript({
        script: value,
        collectionUid: collection.uid,
        folderUid: folder.uid
      })
    );
  };

  const onResponseScriptEdit = (value) => {
    dispatch(
      updateFolderResponseScript({
        script: value,
        collectionUid: collection.uid,
        folderUid: folder.uid
      })
    );
  };

  const handleSave = () => {
    dispatch(saveFolderRoot(collection.uid, folder.uid));
  };

  const items = flattenItems(folder.items || []);
  const hasPreRequestScriptError = items.some((i) => isItemARequest(i) && i.preRequestScriptErrorMessage);
  const hasPostResponseScriptError = items.some((i) => isItemARequest(i) && i.postResponseScriptErrorMessage);

  return (
    <StyledWrapper className="w-full flex flex-col h-full">
      <div className="text-xs mb-4 text-muted">
        Pre and post-request scripts that will run before and after any request inside this folder is sent.
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pre-request">
            Pre Request
            {requestScript && requestScript.trim().length > 0 && (
              <StatusDot type={hasPreRequestScriptError ? 'error' : 'default'} />
            )}
          </TabsTrigger>
          <TabsTrigger value="post-response">
            Post Response
            {responseScript && responseScript.trim().length > 0 && (
              <StatusDot type={hasPostResponseScriptError ? 'error' : 'default'} />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pre-request" className="mt-2">
          <CodeEditor
            ref={preRequestEditorRef}
            collection={collection}
            value={requestScript || ''}
            theme={displayedTheme}
            onEdit={onRequestScriptEdit}
            mode="javascript"
            onSave={handleSave}
            font={get(preferences, 'font.codeFont', 'default')}
            fontSize={get(preferences, 'font.codeFontSize')}
            showHintsFor={['req', 'bru']}
            initialScroll={preReqScroll}
          />
        </TabsContent>

        <TabsContent value="post-response" className="mt-2">
          <CodeEditor
            ref={postResponseEditorRef}
            collection={collection}
            value={responseScript || ''}
            theme={displayedTheme}
            onEdit={onResponseScriptEdit}
            mode="javascript"
            onSave={handleSave}
            font={get(preferences, 'font.codeFont', 'default')}
            fontSize={get(preferences, 'font.codeFontSize')}
            showHintsFor={['req', 'res', 'bru']}
            initialScroll={postResScroll}
          />
        </TabsContent>
      </Tabs>

      <div className="mt-12">
        <Button type="submit" size="sm" onClick={handleSave}>
          Save
        </Button>
      </div>
    </StyledWrapper>
  );
};

export default Script;
