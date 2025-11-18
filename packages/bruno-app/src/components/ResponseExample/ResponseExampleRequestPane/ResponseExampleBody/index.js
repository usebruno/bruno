import React, { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import get from 'lodash/get';
import { updateResponseExampleRequest } from 'providers/ReduxStore/slices/collections';
import ResponseExampleBodyMode from '../ResponseExampleBodyMode';
import ResponseExampleBodyRenderer from '../ResponseExampleBodyRenderer';
import StyledWrapper from './StyledWrapper';

const ResponseExampleBody = ({ editMode, item, collection, exampleUid, onSave }) => {
  const dispatch = useDispatch();

  const body = useMemo(() => {
    return item.draft
      ? get(item, 'draft.examples', []).find((e) => e.uid === exampleUid)?.request?.body || { mode: 'none' }
      : get(item, 'examples', []).find((e) => e.uid === exampleUid)?.request?.body || { mode: 'none' };
  }, [item, exampleUid]);

  const onBodyEdit = (value) => {
    if (editMode && item && collection.uid && exampleUid) {
      const updatedBody = { ...body };
      switch (body.mode) {
        case 'json':
          updatedBody.json = value;
          break;
        case 'text':
          updatedBody.text = value;
          break;
        case 'xml':
          updatedBody.xml = value;
          break;
        case 'sparql':
          updatedBody.sparql = value;
          break;
        default:
          break;
      }

      dispatch(updateResponseExampleRequest({
        itemUid: item.uid,
        collectionUid: collection.uid,
        exampleUid: exampleUid,
        request: {
          body: updatedBody
        }
      }));
    }
  };

  return (
    <StyledWrapper className="w-full mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="title text-xs mr-2">Body</div>
        </div>
        <ResponseExampleBodyMode
          item={item}
          collection={collection}
          exampleUid={exampleUid}
          body={body}
          bodyMode={body.mode}
          onBodyEdit={onBodyEdit}
          editMode={editMode}
        />
      </div>

      <ResponseExampleBodyRenderer
        bodyMode={body.mode}
        body={body}
        editMode={editMode}
        item={item}
        collection={collection}
        exampleUid={exampleUid}
        onBodyEdit={onBodyEdit}
        onSave={onSave}
      />
    </StyledWrapper>
  );
};

export default ResponseExampleBody;
