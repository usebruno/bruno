import React, { useState } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import {
  addRequestHeader,
  updateRequestHeader,
  deleteRequestHeader,
  moveRequestHeader,
  setRequestHeaders
} from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import SingleLineEditor from 'components/SingleLineEditor';
import StyledWrapper from './StyledWrapper';
import { headers as StandardHTTPHeaders } from 'know-your-http-well';
import BulkEditableTable from 'components/BulkEditableTable';

const headerAutoCompleteList = StandardHTTPHeaders.map((e) => e.header);
import { MimeTypes } from 'utils/codemirror/autocompleteConstants';

const parseBulkHeaders = (value) => {
  return value
    .split(/\r?\n/)
    .map((pair) => {
      const isEnabled = !pair.trim().startsWith('//');
      const cleanPair = pair.replace(/^\/\/\s*/, '');
      const sep = cleanPair.indexOf(':');
      if (sep < 0) return null;
      return {
        name: cleanPair.slice(0, sep).trim(),
        value: cleanPair.slice(sep + 1).trim(),
        enabled: isEnabled
      };
    })
    .filter(Boolean);
};

const serializeBulkHeaders = (headers) =>
  headers
    .map((header) => `${header.enabled ? '' : '//'}${header.name}:${header.value}`)
    .join('\n');

const RequestHeaders = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const headers = item.draft ? get(item, 'draft.request.headers') : get(item, 'request.headers');

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));
  const handleRun = () => dispatch(sendRequest(item, collection.uid));

  const handleAddHeader = () => {
    dispatch(addRequestHeader({ itemUid: item.uid, collectionUid: collection.uid }));
  };

  const handleEditHeader = (header, key, value) => {
    const updated = { ...header, [key]: value };
    dispatch(updateRequestHeader({ header: updated, itemUid: item.uid, collectionUid: collection.uid }));
  };

  const handleRemoveHeader = (header) => {
    dispatch(deleteRequestHeader({ headerUid: header.uid, itemUid: item.uid, collectionUid: collection.uid }));
  };

  const handleEnableHeader = (header, enabled) => {
    const updated = { ...header, enabled };
    dispatch(updateRequestHeader({ header: updated, itemUid: item.uid, collectionUid: collection.uid }));
  };

  const handleReorderHeader = ({ updateReorderedItem }) => {
    dispatch(moveRequestHeader({ collectionUid: collection.uid, itemUid: item.uid, updateReorderedItem }));
  };

  const handleBulkSetHeaders = (headers) => {
    dispatch(setRequestHeaders({ collectionUid: collection.uid, itemUid: item.uid, headers }));
  };

  return (
    <StyledWrapper className="w-full h-full">
      <BulkEditableTable
        items={headers}
        columns={[
          { name: 'Key', accessor: 'key', width: '30%' },
          { name: 'Value', accessor: 'value', width: '60%' },
          { name: '', accessor: '', width: '10%' }
        ]}
        bulkLabel="Header"
        onAdd={handleAddHeader}
        onEdit={handleEditHeader}
        onRemove={handleRemoveHeader}
        onEnable={handleEnableHeader}
        onReorder={handleReorderHeader}
        onBulkSet={handleBulkSetHeaders}
        parseBulk={parseBulkHeaders}
        serializeBulk={serializeBulkHeaders}
        renderNameEditor={(header) => (
          <SingleLineEditor
            value={header.name}
            theme={displayedTheme}
            onSave={onSave}
            onChange={(newValue) => handleEditHeader(header, 'name', newValue)}
            autocomplete={headerAutoCompleteList}
            onRun={handleRun}
            collection={collection}
          />
        )}
        renderValueEditor={(header) => (
          <SingleLineEditor
            value={header.value}
            theme={displayedTheme}
            onSave={onSave}
            onChange={(newValue) => handleEditHeader(header, 'value', newValue)}
            onRun={handleRun}
            autocomplete={MimeTypes}
            allowNewlines={true}
            collection={collection}
            item={item}
          />
        )}
      />
    </StyledWrapper>
  );
};

export default RequestHeaders;
