import { IconInfoCircle } from '@tabler/icons';
import EditableTable from 'components/EditableTable';
import SingleLineEditor from 'components/SingleLineEditor';
import { headers as StandardHTTPHeaders } from 'know-your-http-well';
import get from 'lodash/get';
import { moveRequestHeader, setRequestHeaders } from 'providers/ReduxStore/slices/collections';
import { saveRequest, sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Tooltip } from 'react-tooltip';
import { MimeTypes } from 'utils/codemirror/autocompleteConstants';
import { getTreePathFromCollectionToItem } from 'utils/collections/index';
import BulkEditor from '../../BulkEditor';
import StyledWrapper from './StyledWrapper';

const headerAutoCompleteList = StandardHTTPHeaders.map((e) => e.header);

const RequestHeaders = ({ item, collection, addHeaderText }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  const headers = item.draft ? get(item, 'draft.request.headers') : get(item, 'request.headers');

  const allHeaders = useMemo(() => {
    const requestTreePath = getTreePathFromCollectionToItem(collection, item);
    const folderHeaders = [];
    requestTreePath.forEach((pathItem) => {
      if (pathItem.type === 'folder' && pathItem.uid !== item.uid) {
        const fHeaders = pathItem.draft ? get(pathItem, 'draft.request.headers', []) : get(pathItem, 'root.request.headers', []);
        folderHeaders.push(...fHeaders);
      }
    });

    const collectionHeaders = collection.draft?.root
      ? get(collection, 'draft.root.request.headers', [])
      : get(collection, 'root.request.headers', []);

    const categorizedHeaders = {
      request: (headers || []).map((h) => ({ ...h, source: 'request', editable: true, description: 'Request' })),
      folder: (folderHeaders || []).map((h) => ({ ...h, source: 'folder', editable: false, description: 'Folder' })),
      collection: (collectionHeaders || []).map((h) => ({ ...h, source: 'collection', editable: false, description: 'Collection' }))
    };

    return [
      ...categorizedHeaders.request,
      ...categorizedHeaders.folder,
      ...categorizedHeaders.collection
    ];
  }, [headers, collection, item]);

  const [isBulkEditMode, setIsBulkEditMode] = useState(false);

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));
  const handleRun = () => dispatch(sendRequest(item, collection.uid));

  const handleHeadersChange = useCallback(
    (updatedHeaders) => {
      const requestHeaders = updatedHeaders
        .filter((h) => h.source === 'request' || !h.source)
        .map((h) => {
          const { source, editable, description, ...rest } = h;
          return rest;
        });

      dispatch(
        setRequestHeaders({
          collectionUid: collection.uid,
          itemUid: item.uid,
          headers: requestHeaders
        })
      );
    },
    [dispatch, collection.uid, item.uid]
  );

  const handleHeaderDrag = useCallback(
    ({ updateReorderedItem }) => {
      dispatch(
        moveRequestHeader({
          collectionUid: collection.uid,
          itemUid: item.uid,
          updateReorderedItem
        })
      );
    },
    [dispatch, collection.uid, item.uid]
  );

  const toggleBulkEditMode = () => {
    setIsBulkEditMode(!isBulkEditMode);
  };

  const columns = [
    {
      key: 'name',
      name: 'Name',
      isKeyField: true,
      placeholder: 'Name',
      width: '40%',
      render: ({ row, value, onChange, isLastEmptyRow }) => (
        <div className="flex items-center w-full">
          <SingleLineEditor
            value={value || ''}
            theme={storedTheme}
            readOnly={row.editable === false}
            onSave={onSave}
            onChange={(newValue) => onChange(newValue.replace(/[\r\n]/g, ''))}
            autocomplete={headerAutoCompleteList}
            onRun={handleRun}
            collection={collection}
            item={item}
            placeholder={isLastEmptyRow ? 'Name' : ''}
          />
          {row.editable === false && (
            <div className="ml-1 flex items-center text-muted" aria-label={`Inherited from ${row.description}`}>
              <IconInfoCircle size={16} strokeWidth={1.5} data-tooltip-id={`info-${row.uid}`} />
              <Tooltip className="tooltip-mod" id={`info-${row.uid}`} html={`Inherited from ${row.description}`} />
            </div>
          )}
        </div>
      )
    },
    {
      key: 'value',
      name: 'Value',
      placeholder: 'Value',
      width: '50%',
      render: ({ row, value, onChange, isLastEmptyRow }) => (
        <SingleLineEditor
          value={value || ''}
          theme={storedTheme}
          readOnly={row.editable === false}
          onSave={onSave}
          onChange={onChange}
          onRun={handleRun}
          autocomplete={MimeTypes}
          collection={collection}
          item={item}
          placeholder={isLastEmptyRow ? 'Value' : ''}
        />
      )
    }
  ];

  const defaultRow = {
    name: '',
    value: '',
    description: ''
  };

  if (isBulkEditMode) {
    return (
      <StyledWrapper className="w-full mt-3">
        <BulkEditor params={headers} onChange={handleHeadersChange} onToggle={toggleBulkEditMode} onSave={onSave} onRun={handleRun} />
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper className="w-full">
      <EditableTable
        columns={columns}
        rows={allHeaders || []}
        onChange={handleHeadersChange}
        defaultRow={defaultRow}
        reorderable={true}
        onReorder={handleHeaderDrag}
      />
      <div className="flex justify-end mt-2">
        <button className="btn-action text-link select-none" onClick={toggleBulkEditMode}>
          Bulk Edit
        </button>
      </div>
    </StyledWrapper>
  );
};

export default RequestHeaders;
