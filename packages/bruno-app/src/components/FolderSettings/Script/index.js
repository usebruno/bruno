import React, { useState, useEffect, useRef } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import CodeEditor from 'components/CodeEditor';
import { updateFolderRequestScript, updateFolderResponseScript } from 'providers/ReduxStore/slices/collections';
import { saveFolderRoot } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import { Tabs, TabsList, TabsTrigger, TabsContent } from 'components/Tabs';
import StatusDot from 'components/StatusDot';
import StyledWrapper from './StyledWrapper';
import Button from 'ui/Button';

const Script = ({ collection, folder }) => {
  const dispatch = useDispatch();
  const preRequestEditorRef = useRef(null);
  const postResponseEditorRef = useRef(null);
  const requestScript = folder.draft ? get(folder, 'draft.request.script.req', '') : get(folder, 'root.request.script.req', '');
  const responseScript = folder.draft ? get(folder, 'draft.request.script.res', '') : get(folder, 'root.request.script.res', '');

  // Default to post-response if pre-request script is empty
  const getInitialTab = () => {
    const hasPreRequestScript = requestScript && requestScript.trim().length > 0;
    return hasPreRequestScript ? 'pre-request' : 'post-response';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const prevFolderUidRef = useRef(folder.uid);

  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  // Update active tab only when switching to a different folder
  useEffect(() => {
    if (prevFolderUidRef.current !== folder.uid) {
      prevFolderUidRef.current = folder.uid;
      const hasPreRequestScript = requestScript && requestScript.trim().length > 0;
      setActiveTab(hasPreRequestScript ? 'pre-request' : 'post-response');
    }
  }, [folder.uid, requestScript]);

  // Refresh CodeMirror when tab becomes visible
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'pre-request' && preRequestEditorRef.current?.editor) {
        preRequestEditorRef.current.editor.refresh();
      } else if (activeTab === 'post-response' && postResponseEditorRef.current?.editor) {
        postResponseEditorRef.current.editor.refresh();
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

  return (
    <StyledWrapper className="w-full flex flex-col h-full">
      <div className="text-xs mb-4 text-muted">
        Pre and post-request scripts that will run before and after any request inside this folder is sent.
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pre-request">
            Pre Request
            {requestScript && requestScript.trim().length > 0 && <StatusDot />}
          </TabsTrigger>
          <TabsTrigger value="post-response">
            Post Response
            {responseScript && responseScript.trim().length > 0 && <StatusDot />}
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
