import React, { useState, useEffect, useRef } from 'react';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import { useDispatch } from 'react-redux';
import { addAssertion, updateAssertion, deleteAssertion } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import AssertionRow from './AssertionRow';
import StyledWrapper from './StyledWrapper';
import { useTheme } from 'providers/Theme/index';

const Assertions = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const assertions = item.draft ? get(item, 'draft.request.assertions') : get(item, 'request.assertions');

  const [countItems, setCountItems] = useState(assertions.length);
  const ref = useRef();

  useEffect(() => {
    setCountItems(assertions.length);
    if (assertions.length > countItems) {
      ref.current.scrollIntoView();
    }
  }, [assertions]);

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
      <div className="scroll" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
        <table>
          <thead style={{ backgroundColor: theme.table.thead.bg, position: 'sticky', top: -1, zIndex: 2 }}>
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
        <div ref={ref} />
      </div>
      <button className="btn-add-assertion text-link pr-2 py-3 mt-2 select-none" onClick={handleAddAssertion}>
        + Add Assertion
      </button>
    </StyledWrapper>
  );
};
export default Assertions;
