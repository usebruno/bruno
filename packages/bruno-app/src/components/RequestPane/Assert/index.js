import React from 'react';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import { IconTrash } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { addAssertion, updateAssertion, deleteAssertion } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import SingleLineEditor from 'components/SingleLineEditor';
import StyledWrapper from './StyledWrapper';

const Assertions = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const assertions = item.draft ? get(item, 'draft.request.assertions') : get(item, 'request.assertions');

  const handleAddAssertion = () => {
    dispatch(
      addAssertion({
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));
  const handleRun = () => dispatch(sendRequest(item, collection.uid));
  const handleAssertionChange = (e, _assertion, type) => {
    const assertion = cloneDeep(_assertion);
    switch (type) {
      case 'name': {
        assertion.name = e.target.value;
        break;
      }
      case 'value': {
        assertion.value = e.target.value;
        break;
      }
      case 'enabled': {
        assertion.enabled = e.target.checked;
        break;
      }
    }
    dispatch(
      updateAssertion({
        assertion: assertion,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const handleRemoveAssertion = (assertion) => {
    dispatch(
      deleteAssertion({
        assertUid: assertion.uid,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  return (
    <StyledWrapper className="w-full">
      <table>
        <thead>
          <tr>
            <td>Expr</td>
            <td>Value</td>
            <td></td>
          </tr>
        </thead>
        <tbody>
          {assertions && assertions.length
            ? assertions.map((assertion, index) => {
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
                      <SingleLineEditor
                        value={assertion.value}
                        theme={storedTheme}
                        onSave={onSave}
                        onChange={(newValue) => handleAssertionChange({
                          target: {
                            value: newValue
                          }
                        }, assertion, 'value')}
                        onRun={handleRun}
                        collection={collection}
                      />
                    </td>
                    <td>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={assertion.enabled}
                          className="mr-3 mousetrap"
                          onChange={(e) => handleAssertionChange(e, assertion, 'enabled')}
                        />
                        <button onClick={() => handleRemoveAssertion(assertion)}>
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
      <button className="btn-add-assertion text-link pr-2 py-3 mt-2 select-none" onClick={handleAddAssertion}>
        + Add Assertion
      </button>
    </StyledWrapper>
  );
};
export default Assertions;
