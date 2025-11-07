import React, { useState, useEffect, useRef } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import CodeEditor from 'components/CodeEditor';
import { updateRequestScript, updateResponseScript } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import { Tabs, TabsList, TabsTrigger, TabsContent } from 'components/Tabs';

const Script = ({ item, collection }) => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('pre-request');
  const preRequestEditorRef = useRef(null);
  const postResponseEditorRef = useRef(null);
  const requestScript = item.draft ? get(item, 'draft.request.script.req') : get(item, 'request.script.req');
  const responseScript = item.draft ? get(item, 'draft.request.script.res') : get(item, 'request.script.res');

  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  // Refresh CodeMirror when tab becomes visible
  useEffect(() => {
    // Small delay to ensure DOM is updated
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
      updateRequestScript({
        script: value,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const onResponseScriptEdit = (value) => {
    dispatch(
      updateResponseScript({
        script: value,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const onRun = () => dispatch(sendRequest(item, collection.uid));
  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));

  return (
    <div className="w-full h-full flex flex-col pt-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pre-request">Pre Request</TabsTrigger>
          <TabsTrigger value="post-response">Post Response</TabsTrigger>
        </TabsList>

        <TabsContent value="pre-request" className="mt-2" dataTestId="pre-request-script-editor">
          <CodeEditor
            ref={preRequestEditorRef}
            collection={collection}
            value={requestScript || ''}
            theme={displayedTheme}
            font={get(preferences, 'font.codeFont', 'default')}
            fontSize={get(preferences, 'font.codeFontSize')}
            onEdit={onRequestScriptEdit}
            mode="javascript"
            onRun={onRun}
            onSave={onSave}
            showHintsFor={['req', 'bru']}
          />
        </TabsContent>

        <TabsContent value="post-response" className="mt-2" dataTestId="post-response-script-editor">
          <CodeEditor
            ref={postResponseEditorRef}
            collection={collection}
            value={responseScript || ''}
            theme={displayedTheme}
            font={get(preferences, 'font.codeFont', 'default')}
            fontSize={get(preferences, 'font.codeFontSize')}
            onEdit={onResponseScriptEdit}
            mode="javascript"
            onRun={onRun}
            onSave={onSave}
            showHintsFor={['req', 'res', 'bru']}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Script;
