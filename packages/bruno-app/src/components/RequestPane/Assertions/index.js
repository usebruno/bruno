import React from 'react';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import { useDispatch } from 'react-redux';
import { addAssertion, updateAssertion, deleteAssertion } from '@providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from '@providers/ReduxStore/slices/collections/actions';
import AssertionRow from './AssertionRow';
import StyledWrapper from './StyledWrapper';

const Assertions = ({ item, collection }) => {
  const dispatch = useDispatch();
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
            <td>Operator</td>
            <td>Value</td>
            <td></td>
          </tr>
        </thead>
        <tbody>
          {assertions && assertions.length
            ? assertions.map((assertion) => {
                return (
                  <AssertionRow
                    key={assertion.uid}
                    assertion={assertion}
                    item={item}
                    collection={collection}
                    handleAssertionChange={handleAssertionChange}
                    handleRemoveAssertion={handleRemoveAssertion}
                    onSave={onSave}
                    handleRun={handleRun}
                  />
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
