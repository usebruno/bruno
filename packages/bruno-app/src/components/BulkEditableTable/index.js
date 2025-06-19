import React, { useState } from 'react';
import Table from 'components/Table';
import ReorderTable from 'components/ReorderTable';
import CodeEditor from 'components/CodeEditor';
import { IconTrash } from '@tabler/icons';
import { useTheme } from 'providers/Theme';
import { useSelector } from 'react-redux';

/**
 * Generic table with bulk edit and reorderable rows for key/value pairs.
 * Props:
 * - items: array of { name, value, enabled, uid }
 * - columns: [{ name, accessor, width }]
 * - bulkLabel: string (e.g. 'Header', 'Param')
 * - onAdd: () => void
 * - onEdit: (item, key, value) => void
 * - onRemove: (item) => void
 * - onEnable: (item, enabled) => void
 * - onReorder: ({ updateReorderedItem }) => void
 * - onBulkSet: (items) => void
 * - parseBulk: (text) => items[]
 * - serializeBulk: (items) => string
 */
const BulkEditableTable = ({
  items = [],
  columns = [
    { name: 'Key', accessor: 'name', width: '30%' },
    { name: 'Value', accessor: 'value', width: '60%' },
    { name: '', accessor: '', width: '10%' }
  ],
  bulkLabel = 'Item',
  onAdd,
  onEdit,
  onRemove,
  onEnable,
  onReorder,
  onBulkSet,
  parseBulk,
  serializeBulk,
  renderValueEditor,
  renderNameEditor
}) => {
  const [bulkEdit, setBulkEdit] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  const handleBulkEdit = (value) => {
    setBulkText(value);
    if (onBulkSet && parseBulk) {
      const parsed = parseBulk(value);
      onBulkSet(parsed);
    }
  };

  const toggleBulkEdit = () => {
    if (!bulkEdit && serializeBulk) {
      setBulkText(serializeBulk(items));
    }
    setBulkEdit(!bulkEdit);
  };

  return (
    <div className="w-full h-full">
      {bulkEdit ? (
        <div>
          <div className="h-[200px]">
            <CodeEditor
              mode="application/text"
              theme={displayedTheme}
              font={preferences.codeFont || 'default'}
              value={bulkText}
              onEdit={handleBulkEdit}
            />
          </div>
          <div className="flex justify-between items-center mt-3">
            <div></div>
            <button className="text-link select-none" onClick={toggleBulkEdit}>
              {bulkEdit ? 'Key/Value Edit' : 'Bulk Edit'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <Table headers={columns}>
            <ReorderTable updateReorderedItem={onReorder}>
              {items && items.length
                ? items.map((item) => (
                    <tr key={item.uid} data-uid={item.uid}>
                      <td className="flex relative">
                        {renderNameEditor ? (
                          renderNameEditor(item)
                        ) : (
                          <input type="text" value={item.name} onChange={(e) => onEdit(item, 'name', e.target.value)} />
                        )}
                      </td>
                      <td>
                        {renderValueEditor ? (
                          renderValueEditor(item)
                        ) : (
                          <input
                            type="text"
                            value={item.value}
                            onChange={(e) => onEdit(item, 'value', e.target.value)}
                          />
                        )}
                      </td>
                      <td>
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={item.enabled}
                            className="mr-3"
                            onChange={(e) => onEnable(item, e.target.checked)}
                          />
                          <button onClick={() => onRemove(item)}>
                            <IconTrash strokeWidth={1.5} size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                : null}
            </ReorderTable>
          </Table>
          <div className="flex justify-between items-center mt-3">
            <button className="text-link pr-3 select-none" onClick={onAdd}>
              + Add {bulkLabel}
            </button>
            <button className="text-link select-none" onClick={toggleBulkEdit}>
              {bulkEdit ? 'Key/Value Edit' : 'Bulk Edit'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkEditableTable;
