import React from 'react';
import cloneDeep from 'lodash/cloneDeep';
import { IconTrash } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { saveCollectionRoot } from 'providers/ReduxStore/slices/collections/actions';
import SingleLineEditor from 'components/SingleLineEditor';
import InfoTip from 'components/InfoTip';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import { variableNameRegex } from 'utils/common/regex';
import {
  addCollectionVar,
  deleteCollectionVar,
  updateCollectionVar
} from 'providers/ReduxStore/slices/collections/index';

const VarsTable = ({ collection, vars, varType }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  const addVar = () => {
    dispatch(
      addCollectionVar({
        collectionUid: collection.uid,
        type: varType
      })
    );
  };

  const onSave = () => dispatch(saveCollectionRoot(collection.uid));
  const handleVarChange = (e, v, type) => {
    const _var = cloneDeep(v);
    switch (type) {
      case 'name': {
        const value = e.target.value;

        if (variableNameRegex.test(value) === false) {
          toast.error(
            'Variable contains invalid characters! Variables must only contain alpha-numeric characters, "-", "_", "."'
          );
          return;
        }

        _var.name = value;
        break;
      }
      case 'value': {
        _var.value = e.target.value;
        break;
      }
      case 'enabled': {
        _var.enabled = e.target.checked;
        break;
      }
    }
    dispatch(
      updateCollectionVar({
        type: varType,
        var: _var,
        collectionUid: collection.uid
      })
    );
  };

  const handleRemoveVar = (_var) => {
    dispatch(
      deleteCollectionVar({
        type: varType,
        varUid: _var.uid,
        collectionUid: collection.uid
      })
    );
  };

  return (
    <StyledWrapper className="w-full">
      <table>
        <thead>
          <tr>
            <td>Name</td>
            {varType === 'request' ? (
              <td>
                <div className="flex items-center">
                  <span>Value</span>
                </div>
              </td>
            ) : (
              <td>
                <div className="flex items-center">
                  <span>Expr</span>
                  <InfoTip text="You can write any valid JS Template Literal here" infotipId="request-var" />
                </div>
              </td>
            )}
            <td></td>
          </tr>
        </thead>
        <tbody>
          {vars && vars.length
            ? vars.map((_var) => {
                return (
                  <tr key={_var.uid}>
                    <td>
                      <input
                        type="text"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        value={_var.name}
                        className="mousetrap"
                        onChange={(e) => handleVarChange(e, _var, 'name')}
                      />
                    </td>
                    <td>
                      <SingleLineEditor
                        value={_var.value}
                        theme={storedTheme}
                        onSave={onSave}
                        onChange={(newValue) =>
                          handleVarChange(
                            {
                              target: {
                                value: newValue
                              }
                            },
                            _var,
                            'value'
                          )
                        }
                        collection={collection}
                      />
                    </td>
                    <td>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={_var.enabled}
                          tabIndex="-1"
                          className="mr-3 mousetrap"
                          onChange={(e) => handleVarChange(e, _var, 'enabled')}
                        />
                        <button tabIndex="-1" onClick={() => handleRemoveVar(_var)}>
                          <IconTrash strokeWidth={1.5} size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            : null}
        </tbody>
      </table>
      <button className="btn-add-var text-link pr-2 py-3 mt-2 select-none" onClick={addVar}>
        + Add
      </button>
    </StyledWrapper>
  );
};
export default VarsTable;
