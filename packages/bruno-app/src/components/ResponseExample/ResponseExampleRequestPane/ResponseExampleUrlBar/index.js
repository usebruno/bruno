import React from 'react';
import { useDispatch } from 'react-redux';
import { updateResponseExampleRequestUrl } from 'providers/ReduxStore/slices/collections';
import SingleLineEditor from 'components/SingleLineEditor';
import StyledWrapper from './StyledWrapper';
import get from 'lodash/get';

const ResponseExampleUrlBar = ({ item, collection, editMode, onSave, exampleUid }) => {
  const dispatch = useDispatch();

  // Get method and URL from the example, not the main request
  const exampleData = item.draft ? get(item, 'draft.examples', []).find((e) => e.uid === exampleUid) : get(item, 'examples', []).find((e) => e.uid === exampleUid);
  const method = get(exampleData, 'request.method');
  const url = get(exampleData, 'request.url');

  const onChange = (value) => {
    dispatch(updateResponseExampleRequestUrl({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      request: { url: value }
    }));
  };

  const getMethodClass = () => {
    switch (method) {
      case 'GET':
        return 'method-get';
      case 'POST':
        return 'method-post';
      case 'PUT':
        return 'method-put';
      case 'DELETE':
        return 'method-delete';
      case 'PATCH':
        return 'method-patch';
      case 'OPTIONS':
        return 'method-options';
      case 'HEAD':
        return 'method-head';
      case 'OPTIONS':
        return 'method-options';
      case 'HEAD':
        return 'method-head';
      default:
        return 'method-get';
    };
  };

  return (
    <StyledWrapper className="flex items-center">
      <div className="url-bar-container w-full flex p-2 text-xs rounded-md items-center justify-between" data-testid="url-bar-container">
        <div className={`method flex text-xs items-center justify-center px-2 rounded h-6 flex-shrink-0 mr-2 overflow-hidden whitespace-nowrap font-semibold ${getMethodClass()}`}>
          {method || 'GET'}
        </div>

        <div
          id="response-example-url"
          className="response-example-url flex items-center flex-1 h-6"
        >
          <SingleLineEditor
            value={url}
            onSave={onSave}
            onChange={onChange}
            collection={collection}
            highlightPathParams={true}
            item={item}
            readOnly={!editMode}
          />
        </div>
      </div>
    </StyledWrapper>
  );
};

export default ResponseExampleUrlBar;
