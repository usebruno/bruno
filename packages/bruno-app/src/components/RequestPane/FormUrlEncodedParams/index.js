import React, { useCallback, useRef } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import {
  moveFormUrlEncodedParam,
  setFormUrlEncodedParams
} from 'providers/ReduxStore/slices/collections';
import MultiLineEditor from 'components/MultiLineEditor';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { updateTableColumnWidths } from 'providers/ReduxStore/slices/tabs';
import EditableTable from 'components/EditableTable';
import StyledWrapper from './StyledWrapper';
import { usePersistedState } from 'hooks/usePersistedState';
import { useTrackScroll } from 'hooks/useTrackScroll';

const FormUrlEncodedParams = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const wrapperRef = useRef(null);
  const [scroll, setScroll] = usePersistedState({ key: `request-body-formUrlEncoded-scroll-${item.uid}`, default: 0 });
  useTrackScroll({ ref: wrapperRef, selector: '.flex-boundary', onChange: setScroll, initialValue: scroll });
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const params = item.draft ? get(item, 'draft.request.body.formUrlEncoded') : get(item, 'request.body.formUrlEncoded');

  // Get column widths from Redux
  const focusedTab = tabs?.find((t) => t.uid === activeTabUid);
  const formUrlEncodedWidths = focusedTab?.tableColumnWidths?.['form-url-encoded'] || {};

  const handleColumnWidthsChange = (tableId, widths) => {
    dispatch(updateTableColumnWidths({ uid: activeTabUid, tableId, widths }));
  };

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
    }
  ];

  const defaultRow = {
    name: '',
    value: '',
    description: ''
  };

  return (
    <StyledWrapper className="w-full" ref={wrapperRef}>
      <EditableTable
        tableId="form-url-encoded"
        columns={columns}
        rows={params || []}
        onChange={handleParamsChange}
        defaultRow={defaultRow}
        reorderable={true}
        onReorder={handleParamDrag}
        columnWidths={formUrlEncodedWidths}
        onColumnWidthsChange={(widths) => handleColumnWidthsChange('form-url-encoded', widths)}
        initialScroll={scroll}
      />
    </StyledWrapper>
  );
};

export default FormUrlEncodedParams;
