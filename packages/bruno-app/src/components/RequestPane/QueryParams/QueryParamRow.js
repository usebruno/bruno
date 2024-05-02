import { React } from 'react';
import SingleLineEditor from 'components/SingleLineEditor';
import { IconTrash } from '@tabler/icons';
import { useTheme } from 'providers/Theme';

export const QueryParamRow = ({ param, collection, onSave, onRun, onChangeEvent, onTrashEvent }) => {
  const { storedTheme } = useTheme();

  return (
    <tr key={param.uid} draggable="true">
      <td className="draggable-handle">
        <div draggable="true" onDrag={console.log('foo')}>
          {/* TODO replace with fitting icon */}
          ...
        </div>
      </td>
      <td>
        <input
          type="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          value={param.name}
          className="mousetrap"
          onChange={(e) => onChangeEvent(e, param, 'name')}
        />
      </td>
      <td>
        <SingleLineEditor
          value={param.value}
          theme={storedTheme}
          onSave={() => onSave()}
          onChange={(newValue) =>
            onChangeEvent(
              {
                target: {
                  value: newValue
                }
              },
              param,
              'value'
            )
          }
          onRun={() => onRun()}
          collection={collection}
        />
      </td>
      <td>
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={param.enabled}
            tabIndex="-1"
            className="mr-3 mousetrap"
            onChange={(e) => onChangeEvent(e, param, 'enabled')}
          />
          <button tabIndex="-1" onClick={() => onTrashEvent(param)}>
            <IconTrash strokeWidth={1.5} size={20} />
          </button>
        </div>
      </td>
    </tr>
  );
};
