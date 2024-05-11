import { React } from 'react';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import { useDispatch } from 'react-redux';
import {
  addQueryParam,
  updateQueryParam,
  deleteQueryParam,
  moveQueryParam
} from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import StyledWrapper from './StyledWrapper';
import { QueryParamRow } from './QueryParamRow';

const QueryParams = ({ item, collection }) => {
  const dispatch = useDispatch();
  const params = item.draft ? get(item, 'draft.request.params') : get(item, 'request.params');

  const handleAddParam = () => {
    dispatch(
      addQueryParam({
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));
  const handleRun = () => dispatch(sendRequest(item, collection.uid));
  const handleParamChange = (e, _param, type) => {
    const param = cloneDeep(_param);

    switch (type) {
      case 'name': {
        param.name = e.target.value;
        break;
      }
      case 'value': {
        param.value = e.target.value;
        break;
      }
      case 'enabled': {
        param.enabled = e.target.checked;
        break;
      }
    }

    updateParam(param);
  };

  const handleRemoveParam = (param) => {
    dispatch(
      deleteQueryParam({
        paramUid: param.uid,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const updateParam = (param) => {
    dispatch(
      updateQueryParam({
        collectionUid: collection.uid,
        itemUid: item.uid,
        param: param
      })
    );
  };

  const handleParamDrag = (sourceIndex, targetIndex) => {
    dispatch(
      moveQueryParam({
        sourceIndex: sourceIndex,
        targetIndex: targetIndex,
        paramUid: params[sourceIndex].uid,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
    updateParam(params[sourceIndex]);
  };

  return (
    <StyledWrapper className="w-full">
      <DndProvider backend={HTML5Backend}>
        <table className="draggable-table select-text">
          <thead>
            <tr>
              <td></td>
              <td>Name</td>
              <td>Value</td>
              <td></td>
            </tr>
          </thead>
          <tbody>
            {params && params.length
              ? params.map((param, index) => {
                  return (
                    <QueryParamRow
                      param={param}
                      index={index}
                      collection={collection}
                      onSave={onSave}
                      onRun={handleRun}
                      onChangeEvent={handleParamChange}
                      onTrashEvent={handleRemoveParam}
                      onDragEvent={handleParamDrag}
                    />
                  );
                })
              : null}
          </tbody>
        </table>
      </DndProvider>
      <button className="btn-add-param text-link pr-2 py-3 mt-2 select-none" onClick={handleAddParam}>
        +&nbsp;<span>Add Param</span>
      </button>
    </StyledWrapper>
  );
};
export default QueryParams;
