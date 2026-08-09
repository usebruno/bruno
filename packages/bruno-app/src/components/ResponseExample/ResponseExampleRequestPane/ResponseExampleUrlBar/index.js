import React, { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { updateResponseExampleRequest, updateResponseExampleRequestUrl } from 'providers/ReduxStore/slices/collections';
import SingleLineEditor from 'components/SingleLineEditor';
import HttpMethodSelector from 'components/RequestPane/QueryUrl/HttpMethodSelector';
import StyledWrapper from './StyledWrapper';
import get from 'lodash/get';

const ResponseExampleUrlBar = ({ item, collection, editMode, onSave, exampleUid, allowMethodSelect = false }) => {
  const dispatch = useDispatch();

  const exampleData = useMemo(() => {
    return item.draft ? get(item, 'draft.examples', []).find((e) => e.uid === exampleUid) : get(item, 'examples', []).find((e) => e.uid === exampleUid);
  }, [item, exampleUid]);
  // Keep '' so HttpMethodSelector custom-method mode can clear the value while typing
  const method = get(exampleData, 'request.method') ?? 'GET';
  const url = get(exampleData, 'request.url');

  const onChange = (value) => {
    if (!editMode) {
      return;
    }

    dispatch(updateResponseExampleRequestUrl({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      request: { url: value }
    }));
  };

  const onMethodSelect = (nextMethod) => {
    if (!editMode || !allowMethodSelect) {
      return;
    }

    dispatch(updateResponseExampleRequest({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      request: { method: nextMethod }
    }));
  };

  const getMethodClass = () => {
    switch ((method || 'GET').toUpperCase()) {
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
      default:
        return 'method-get';
    };
  };

  return (
    <StyledWrapper className="flex items-center">
      <div className="url-bar-container w-full flex p-2 text-xs rounded-md items-center justify-between" data-testid="url-bar-container">
        {allowMethodSelect ? (
          <div
            className={`flex-shrink-0 mr-2 ${editMode ? '' : 'pointer-events-none'}`}
            data-testid="response-example-method-selector"
            inert={!editMode || undefined}
          >
            <HttpMethodSelector
              method={method}
              onMethodSelect={onMethodSelect}
              appendTo={() => document.body}
            />
          </div>
        ) : (
          <div className={`method flex text-xs items-center justify-center px-2 rounded h-6 flex-shrink-0 mr-2 overflow-hidden whitespace-nowrap font-medium uppercase ${getMethodClass()}`}>
            {method || 'GET'}
          </div>
        )}

        <div
          id="response-example-url"
          className="response-example-url flex items-center flex-1 h-6 min-w-0 overflow-hidden"
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
