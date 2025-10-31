import React from 'react';
import { useDispatch } from 'react-redux';
import { updateResponseExampleRequest } from 'providers/ReduxStore/slices/collections';
import BodyModeSelector from 'components/BodyModeSelector';
import { format, applyEdits } from 'jsonc-parser';
import xmlFormat from 'xml-formatter';
import { toastError } from 'utils/common/error';

const ResponseExampleBodyMode = ({ item, collection, exampleUid, body, bodyMode, onBodyEdit, editMode = false }) => {
  const dispatch = useDispatch();

  const onModeChange = (value) => {
    if (item && collection && exampleUid) {
      // Initialize the new body structure based on the selected mode
      let newBody = { mode: value };

      // Preserve existing data for the new mode if it exists
      if (body) {
        switch (value) {
          case 'json':
            newBody.json = body.json || '';
            break;
          case 'text':
            newBody.text = body.text || '';
            break;
          case 'xml':
            newBody.xml = body.xml || '';
            break;
          case 'sparql':
            newBody.sparql = body.sparql || '';
            break;
          case 'formUrlEncoded':
            newBody.formUrlEncoded = body.formUrlEncoded || [];
            break;
          case 'multipartForm':
            newBody.multipartForm = body.multipartForm || [];
            break;
          case 'file':
            newBody.file = body.file || { name: '', data: '' };
            break;
          case 'none':
            // No additional data needed for 'none' mode
            break;
          default:
            break;
        }
      }

      dispatch(updateResponseExampleRequest({
        itemUid: item.uid,
        collectionUid: collection.uid,
        exampleUid: exampleUid,
        request: {
          body: newBody
        }
      }));
    }
  };

  const onPrettify = () => {
    if (body?.json && bodyMode === 'json') {
      try {
        const edits = format(body.json, undefined, { tabSize: 2, insertSpaces: true });
        const prettyBodyJson = applyEdits(body.json, edits);
        onBodyEdit(prettyBodyJson);
      } catch (e) {
        toastError(new Error('Unable to prettify. Invalid JSON format.'));
      }
    } else if (body?.xml && bodyMode === 'xml') {
      try {
        const prettyBodyXML = xmlFormat(body.xml, { collapseContent: true });
        onBodyEdit(prettyBodyXML);
      } catch (e) {
        toastError(new Error('Unable to prettify. Invalid XML format.'));
      }
    }
  };

  return (
    <div className="flex items-center">
      {['json', 'xml'].includes(bodyMode) && (
        <button
          className="btn-action text-link mr-2 py-1 px-2 text-xs"
          onClick={onPrettify}
        >
          Prettify
        </button>
      )}
      <BodyModeSelector
        currentMode={bodyMode}
        onModeChange={onModeChange}
        disabled={!editMode}
      />
    </div>
  );
};

export default ResponseExampleBodyMode;
