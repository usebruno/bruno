import React, { useMemo, useCallback } from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { updateResponseExampleFormUrlEncodedParams } from 'providers/ReduxStore/slices/collections';
import EditableTable from 'components/EditableTable';
import MultiLineEditor from 'components/MultiLineEditor';
import StyledWrapper from './StyledWrapper';

const ResponseExampleFormUrlEncodedParams = ({ item, collection, exampleUid, editMode = false }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  const params = useMemo(() => {
    return item.draft
      ? get(item, 'draft.examples', []).find((e) => e.uid === exampleUid)?.request?.body?.formUrlEncoded || []
      : get(item, 'examples', []).find((e) => e.uid === exampleUid)?.request?.body?.formUrlEncoded || [];
  }, [item, exampleUid]);

  const handleParamsChange = useCallback((updatedParams) => {
    if (!editMode) return;

    dispatch(updateResponseExampleFormUrlEncodedParams({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      params: updatedParams
    }));
  }, [editMode, dispatch, item.uid, collection.uid, exampleUid]);

  const handleParamDrag = useCallback(({ updateReorderedItem }) => {
    if (!editMode) return;

    const reorderedParams = updateReorderedItem.map((uid) => {
      return params.find((p) => p.uid === uid);
    }).filter(Boolean);

    dispatch(updateResponseExampleFormUrlEncodedParams({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      params: reorderedParams
    }));
  }, [editMode, dispatch, item.uid, collection.uid, exampleUid, params]);

  const columns = [
    {
      key: 'name',
      name: 'Key',
      isKeyField: true,
      placeholder: 'Key',
      width: '40%',
      readOnly: !editMode
    },
    {
      key: 'value',
      name: 'Value',
      placeholder: 'Value',
      width: '60%',
      readOnly: !editMode,
      render: ({ value, onChange }) => (
        <MultiLineEditor
          value={value || ''}
          theme={storedTheme}
          onSave={() => {}}
          onChange={onChange}
          allowNewlines={true}
          onRun={() => {}}
          collection={collection}
          item={item}
          placeholder={!value ? 'Value' : ''}
        />
      )
    }
  ];

  const defaultRow = {
    name: '',
    value: '',
    enabled: true
  };

  if (params.length === 0 && !editMode) {
    return null;
  }

  return (
    <StyledWrapper className="w-full mt-4">
      <EditableTable
        columns={columns}
        rows={params || []}
        onChange={handleParamsChange}
        defaultRow={defaultRow}
        reorderable={editMode}
        onReorder={handleParamDrag}
        showAddRow={editMode}
        showDelete={editMode}
        disableCheckbox={!editMode}
      />
    </StyledWrapper>
  );
};

export default ResponseExampleFormUrlEncodedParams;
