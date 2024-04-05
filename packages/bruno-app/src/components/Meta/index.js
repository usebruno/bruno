import 'github-markdown-css/github-markdown.css';
import get from 'lodash/get';
import { updateRequestDocs, updateRequestTimeout } from 'providers/ReduxStore/slices/collections';
import { useTheme } from 'providers/Theme';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import Markdown from 'components/MarkDown';
import CodeEditor from 'components/CodeEditor';
import StyledWrapper from './StyledWrapper';

const Meta = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const docs = item.draft ? get(item, 'draft.request.docs') : get(item, 'request.docs');
  const preferences = useSelector((state) => state.app.preferences);

  const [requestTimeout, setRequestTimeout] = useState(
    item.draft ? get(item, 'draft.request.timeout') : get(item, 'request.timeout') || ''
  );

  const toggleViewMode = () => {
    setIsEditing((prev) => !prev);
  };

  const onEdit = (value) => {
    dispatch(
      updateRequestDocs({
        itemUid: item.uid,
        collectionUid: collection.uid,
        docs: value
      })
    );
  };

  const onTimeoutChange = (e) => {
    setRequestTimeout(e.target.value);
    dispatch(
      updateRequestTimeout({
        itemUid: item.uid,
        collectionUid: collection.uid,
        timeout: e.target.value
      })
    );
  };

  const onSave = (e) => {
    e && e.preventDefault && e.preventDefault();
    dispatch(saveRequest(item.uid, collection.uid));
  };

  if (!item) {
    return null;
  }

  return (
    <StyledWrapper className="mt-1 h-full w-full relative">
      <form className="bruno-form" onSubmit={onSave}>
        <div className="mb-3">
          <div className="flex items-center mb-2">
            <label className="settings-label mr-1" htmlFor="enabled">
              Docs
            </label>
            <div className="editing-mode" role="tab" onClick={toggleViewMode}>
              {isEditing ? 'Preview' : 'Edit'}
            </div>
          </div>
          {isEditing ? (
            <CodeEditor
              collection={collection}
              theme={displayedTheme}
              font={get(preferences, 'font.codeFont', 'default')}
              value={docs || ''}
              onEdit={onEdit}
              onSave={onSave}
              mode="application/text"
            />
          ) : (
            <Markdown onDoubleClick={toggleViewMode} content={docs} />
          )}
        </div>
        <div className="mb-3 flex items-center">
          <label className="settings-label mr-3" htmlFor="requestUrl">
            Timeout (ms)
          </label>
          <div className="flex items-center">
            <div className="flex items-center flex-grow input-container h-full">
              <input
                id="timeout"
                type="number"
                name="timeout"
                className="block textbox"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                onChange={onTimeoutChange}
                value={requestTimeout}
              />
            </div>
          </div>
        </div>
        <div className="mt-6">
          <button type="submit" className="submit btn btn-sm btn-secondary">
            Save
          </button>
        </div>
      </form>
    </StyledWrapper>
  );
};

export default Meta;
