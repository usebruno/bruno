import React from 'react';
import { IconTrash } from '@tabler/icons';
import SingleLineEditor from 'components/SingleLineEditor';
import AssertionOperator from '../AssertionOperator';
import { useTheme } from 'providers/Theme';
import { parseAssertion, unaryOperators } from 'utils/testing/assertions/index';

const AssertionRow = ({ collection, assertion, handleAssertionChange, handleRemoveAssertion, onSave, handleRun }) => {
  const { storedTheme } = useTheme();
  const { operator, value } = parseAssertion(assertion.value);

  return (
    <tr key={assertion.uid}>
      <td>
        <input
          type="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          value={assertion.name}
          className="mousetrap"
          onChange={(e) => handleAssertionChange(e, assertion, 'name')}
        />
      </td>
      <td>
        <AssertionOperator
          operator={operator}
          onChange={(op) =>
            handleAssertionChange(
              {
                target: {
                  value: `${op} ${value}`
                }
              },
              assertion,
              'value'
            )
          }
        />
      </td>
      <td>
        {!unaryOperators.includes(operator) ? (
          <SingleLineEditor
            value={value}
            theme={storedTheme}
            readOnly={true}
            onSave={onSave}
            onChange={(newValue) =>
              handleAssertionChange(
                {
                  target: {
                    value: `${operator} ${newValue}`
                  }
                },
                assertion,
                'value'
              )
            }
            onRun={handleRun}
            collection={collection}
          />
        ) : (
          <input type="text" className="cursor-default" disabled />
        )}
      </td>
      <td>
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={assertion.enabled}
            tabIndex="-1"
            className="mr-3 mousetrap"
            onChange={(e) => handleAssertionChange(e, assertion, 'enabled')}
          />
          <button tabIndex="-1" onClick={() => handleRemoveAssertion(assertion)}>
            <IconTrash strokeWidth={1.5} size={20} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default AssertionRow;
