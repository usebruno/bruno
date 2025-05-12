import React, { useState } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import CodeEditor from 'components/CodeEditor';
import { updateFolderRequestScript, updateFolderResponseScript } from 'providers/ReduxStore/slices/collections';
import { saveFolderRoot } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import StyledWrapper from './StyledWrapper';

const Script = ({ collection, folder }) => {
  const [activeTab, setActiveTab] = useState('pre-request');
  const dispatch = useDispatch();
  const requestScript = get(folder, 'root.request.script.req', '');
  const responseScript = get(folder, 'root.request.script.res', '');

  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

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
      
      <div className="flex space-x-2 mb-2">
        <button
          className={`px-3 py-1.5 text-sm rounded-md ${activeTab === 'pre-request' ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          onClick={() => setActiveTab('pre-request')}
        >
          Pre Request
        </button>
        <button
          className={`px-3 py-1.5 text-sm rounded-md ${activeTab === 'post-response' ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          onClick={() => setActiveTab('post-response')}
        >
          Post Response
        </button>
      </div>

      <div className="flex flex-col flex-1">
        {activeTab === 'pre-request' && (
          <CodeEditor
            collection={collection}
            value={requestScript || ''}
            theme={displayedTheme}
            onEdit={onRequestScriptEdit}
            mode="javascript"
            onSave={handleSave}
            font={get(preferences, 'font.codeFont', 'default')}
            fontSize={get(preferences, 'font.codeFontSize')}
          />
        )}

        {activeTab === 'post-response' && (
          <CodeEditor
            collection={collection}
            value={responseScript || ''}
            theme={displayedTheme}
            onEdit={onResponseScriptEdit}
            mode="javascript"
            onSave={handleSave}
            font={get(preferences, 'font.codeFont', 'default')}
            fontSize={get(preferences, 'font.codeFontSize')}
          />
        )}
      </div>

      <div className="mt-4">
        <button type="submit" className="submit btn btn-sm btn-secondary" onClick={handleSave}>
          Save
        </button>
      </div>
    </StyledWrapper>
  );
};

export default Script;
