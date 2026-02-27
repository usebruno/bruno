import React, { useState, useCallback } from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import {
  moveFormUrlEncodedParam,
  setFormUrlEncodedParams
} from 'providers/ReduxStore/slices/collections';
import MultiLineEditor from 'components/MultiLineEditor';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import EditableTable from 'components/EditableTable';
import StyledWrapper from './StyledWrapper';

const FormUrlEncodedParams = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const params = item.draft ? get(item, 'draft.request.body.formUrlEncoded') : get(item, 'request.body.formUrlEncoded');
  const [showDescriptionColumn, setShowDescriptionColumn] = useState(false);

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));
  const handleRun = () => dispatch(sendRequest(item, collection.uid));

  const handleParamsChange = useCallback((updatedParams) => {
    dispatch(setFormUrlEncodedParams({
      collectionUid: collection.uid,
      itemUid: item.uid,
      params: updatedParams
    }));
  }, [dispatch, collection.uid, item.uid]);

  const handleParamDrag = useCallback(({ updateReorderedItem }) => {
    dispatch(moveFormUrlEncodedParam({
      collectionUid: collection.uid,
      itemUid: item.uid,
      updateReorderedItem
    }));
  }, [dispatch, collection.uid, item.uid]);

  const descriptionColumn = {
    key: 'description',
    name: 'Description',
    placeholder: 'Description',
    width: '25%',
    render: ({ value, onChange }) => (
      <MultiLineEditor
        value={value || ''}
        theme={storedTheme}
        onSave={onSave}
        onChange={onChange}
        allowNewlines={true}
        onRun={handleRun}
        collection={collection}
        item={item}
        placeholder={!value ? 'Description' : ''}
      />
    )
  };

  const columns = [
    {
      key: 'name',
      name: 'Key',
      isKeyField: true,
      placeholder: 'Key',
      width: '30%'
    },
    {
      key: 'value',
      name: 'Value',
      placeholder: 'Value',
      render: ({ value, onChange }) => (
        <MultiLineEditor
          value={value || ''}
          theme={storedTheme}
          onSave={onSave}
          onChange={onChange}
          allowNewlines={true}
          onRun={handleRun}
          collection={collection}
          item={item}
          placeholder={!value ? 'Value' : ''}
        />
      )
    },
    ...(showDescriptionColumn ? [descriptionColumn] : [])
  ];

  const defaultRow = {
    name: '',
    value: '',
    description: ''
  };

  return (
    <StyledWrapper className="w-full">
      <div className="flex justify-end mt-2 mb-2">
        <button
          type="button"
          className="btn-action text-link select-none"
          onClick={() => setShowDescriptionColumn((v) => !v)}
        >
          {showDescriptionColumn ? 'Hide Description' : 'Description'}
        </button>
      </div>
      <EditableTable
        columns={columns}
        rows={params || []}
        onChange={handleParamsChange}
        defaultRow={defaultRow}
        reorderable={true}
        onReorder={handleParamDrag}
      />
    </StyledWrapper>
  );
};

export default FormUrlEncodedParams;
