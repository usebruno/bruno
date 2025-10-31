import React, { useState } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import CodeEditor from 'components/CodeEditor';
import { updateCollectionRequestScript, updateCollectionResponseScript } from 'providers/ReduxStore/slices/collections';
import { saveCollectionRoot } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import { Tabs, TabsList, TabsTrigger, TabsContent } from 'components/Tabs';
import StyledWrapper from './StyledWrapper';

const Script = ({ collection }) => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('pre-request');
  const requestScript = get(collection, 'root.request.script.req', '');
  const responseScript = get(collection, 'root.request.script.res', '');

  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  const onRequestScriptEdit = (value) => {
    dispatch(
      updateCollectionRequestScript({
        script: value,
        collectionUid: collection.uid
      })
    );
  };

  const onResponseScriptEdit = (value) => {
    dispatch(
      updateCollectionResponseScript({
        script: value,
        collectionUid: collection.uid
      })
    );
  };

  const handleSave = () => {
    dispatch(saveCollectionRoot(collection.uid));
  };

  return (
    <StyledWrapper className="w-full flex flex-col h-full pt-4">
      <div className="text-xs mb-4 text-muted">
        Write pre and post-request scripts that will run before and after any request in this collection is sent.
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pre-request">Pre Request</TabsTrigger>
          <TabsTrigger value="post-response">Post Response</TabsTrigger>
        </TabsList>

        <TabsContent value="pre-request" className="mt-2">
          <CodeEditor
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
        <button type="submit" className="submit btn btn-sm btn-secondary" onClick={handleSave}>
          Save
        </button>
      </div>
    </StyledWrapper>
  );
};

export default Script;
