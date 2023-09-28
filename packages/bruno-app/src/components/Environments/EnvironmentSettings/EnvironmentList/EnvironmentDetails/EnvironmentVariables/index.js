import React, { useReducer } from 'react';
import toast from 'react-hot-toast';
import cloneDeep from 'lodash/cloneDeep';
import { IconTrash } from '@tabler/icons';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import { saveEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import reducer from './reducer';
import SingleLineEditor from 'components/SingleLineEditor';
import StyledWrapper from './StyledWrapper';

const EnvironmentVariables = ({ environment, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const [state, reducerDispatch] = useReducer(reducer, { hasChanges: false, variables: environment.variables || [] });
  const { variables, hasChanges } = state;

  const saveChanges = () => {
    dispatch(saveEnvironment(cloneDeep(variables), environment.uid, collection.uid))
      .then(() => {
        toast.success('Changes saved successfully');
        reducerDispatch({
          type: 'CHANGES_SAVED'
        });
      })
      .catch(() => toast.error('An error occurred while saving the changes'));
  };

  const addVariable = () => {
    reducerDispatch({
      type: 'ADD_VAR'
    });
  };

  const handleVarChange = (e, _variable, type) => {
    const variable = cloneDeep(_variable);
    switch (type) {
      case 'name': {
        variable.name = e.target.value;
        break;
      }
      case 'value': {
        variable.value = e.target.value;
        break;
      }
      case 'enabled': {
        variable.enabled = e.target.checked;
        break;
      }
      case 'secret': {
        variable.secret = e.target.checked;
        break;
      }
    }
    reducerDispatch({
      type: 'UPDATE_VAR',
      variable
    });
  };

  const handleRemoveVars = (variable) => {
    reducerDispatch({
      type: 'DELETE_VAR',
      variable
    });
  };

  return (
    <StyledWrapper className="w-full mt-6 mb-6">
      <table>
        <thead>
          <tr>
            <td>Enabled</td>
            <td>Name</td>
            <td>Value</td>
            <td>Secret</td>
            <td></td>
          </tr>
        </thead>
        <tbody>
          {variables && variables.length
            ? variables.map((variable, index) => {
                return (
                  <tr key={variable.uid}>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={variable.enabled}
                        className="mr-3 mousetrap"
                        onChange={(e) => handleVarChange(e, variable, 'enabled')}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        value={variable.name}
                        className="mousetrap"
                        onChange={(e) => handleVarChange(e, variable, 'name')}
                      />
                    </td>
                    <td>
                      <SingleLineEditor
                        value={variable.value}
                        theme={storedTheme}
                        onChange={(newValue) => handleVarChange({ target: { value: newValue } }, variable, 'value')}
                        collection={collection}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={variable.secret}
                        className="mr-3 mousetrap"
                        onChange={(e) => handleVarChange(e, variable, 'secret')}
                      />
                    </td>
                    <td>
                      <button onClick={() => handleRemoveVars(variable)}>
                        <IconTrash strokeWidth={1.5} size={20} />
                      </button>
                    </td>
                  </tr>
                );
              })
            : null}
        </tbody>
      </table>

      <div>
        <button className="btn-add-param text-link pr-2 py-3 mt-2 select-none" onClick={addVariable}>
          + Add Variable
        </button>
      </div>

      <div>
        <button
          type="submit"
          className="submit btn btn-md btn-secondary mt-2"
          disabled={!hasChanges}
          onClick={saveChanges}
        >
          Save
        </button>
      </div>
    </StyledWrapper>
  );
};
export default EnvironmentVariables;
