import React from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import CodeEditor from 'components/CodeEditor';
import { updateCollectionRequestScript, updateCollectionResponseScript } from 'providers/ReduxStore/slices/collections';
import { saveCollectionRoot } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import StyledWrapper from './StyledWrapper';

const Script = ({ collection }) => {
  const dispatch = useDispatch();
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
    <StyledWrapper className="w-full flex flex-col h-full">
      <div className="text-xs mb-4 text-muted">
        Write pre and post-request scripts that will run before and after any request in this collection is sent.
      </div>
      <div className="flex-1 mt-2">
        <div className="mb-1 title text-xs">Pre Request</div>
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
      </div>
      <div className="flex-1 mt-6">
        <div className="mt-1 mb-1 title text-xs">Post Response</div>
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
      </div>

      <div className="mt-12">
        <button type="submit" className="submit btn btn-sm btn-secondary" onClick={handleSave}>
          Save
        </button>
      </div>
    </StyledWrapper>
  );
};

export default Script;
