import React from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import CodeEditor from 'components/CodeEditor';
import { updateCollectionRequestScript, updateCollectionResponseScript } from 'providers/ReduxStore/slices/collections';
import { saveCollectionRoot } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import StyledWrapper from './StyledWrapper';
import CodeEditor2 from 'components/CodeEditor2';
import { MonacoEditor } from 'components/MonacoEditor';

const Script = ({ collection }) => {
  const dispatch = useDispatch();
  const requestScript = get(collection, 'root.request.script.req', '');
  const responseScript = get(collection, 'root.request.script.res', '');

  const { storedTheme } = useTheme();
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
    <StyledWrapper className="w-full flex flex-col">
      <div className="flex-1 mt-2">
        <h3 className="mb-2 title text-xs">Pre Request</h3>
        <MonacoEditor
          collection={collection}
          value={requestScript || ''}
          theme={storedTheme}
          onEdit={onRequestScriptEdit}
          mode="javascript"
          height={'25vh'}
          onSave={handleSave}
          font={get(preferences, 'font.codeFont', 'default')}
        />
      </div>
      <div className="flex-1 mt-2 pb-6">
        <h3 className="mb-2 title text-xs">Post Response</h3>
        <MonacoEditor
          collection={collection}
          value={responseScript || ''}
          theme={storedTheme}
          onEdit={onResponseScriptEdit}
          mode="javascript"
          height={'25vh'}
          onSave={handleSave}
          font={get(preferences, 'font.codeFont', 'default')}
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
