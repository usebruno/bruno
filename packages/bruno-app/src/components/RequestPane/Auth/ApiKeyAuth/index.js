import React, { useRef, forwardRef } from 'react';
import { useDispatch } from 'react-redux';
import get from 'lodash/get';
import { IconCaretDown } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import { useTheme } from 'providers/Theme';
import SingleLineEditor from 'components/SingleLineEditor';
import { updateAuth } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';

const ApiKeyAuth = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);
  const apikeyAuth = item.draft ? get(item, 'draft.request.auth.apikey', {}) : get(item, 'request.auth.apikey', {});

  const handleRun = () => dispatch(sendRequest(item, collection.uid));
  const handleSave = () => dispatch(saveRequest(item.uid, collection.uid));

  const humanizeRequestAPIKeyPlacement = (placement) => {
    switch (placement) {
      case 'headers':
        return 'Headers';
      case 'queryparams':
        return 'Query Params';
      default:
        return 'Headers';
    }
  };

  const Icon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="flex items-center justify-center auth-mode-label select-none">
        {humanizeRequestAPIKeyPlacement(apikeyAuth.placement)}
        <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
      </div>
    );
  });

  const handleKeyChange = (key) => {
    dispatch(
      updateAuth({
        mode: 'apikey',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          key: key,
          value: apikeyAuth.value,
          placement: apikeyAuth.placement
        }
      })
    );
  };

  const handleValueChange = (value) => {
    dispatch(
      updateAuth({
        mode: 'apikey',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          key: apikeyAuth.key,
          value: value,
          placement: apikeyAuth.placement
        }
      })
    );
  };

  const handleValuePlacementChange = (placement) => {
    dispatch(
      updateAuth({
        mode: 'apikey',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          key: apikeyAuth.key,
          value: apikeyAuth.value,
          placement: placement
        }
      })
    );
  };

  return (
    <StyledWrapper>
      <label className="block font-medium mb-2">Key</label>
      <div className="single-line-editor-wrapper mb-2">
        <SingleLineEditor
          value={apikeyAuth.key || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleKeyChange(val)}
          onRun={handleRun}
          collection={collection}
        />
      </div>

      <label className="block font-medium mb-2">Value</label>
      <div className="single-line-editor-wrapper mb-2">
        <SingleLineEditor
          value={apikeyAuth.value || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleValueChange(val)}
          onRun={handleRun}
          collection={collection}
        />
      </div>

      <label className="block font-medium mb-2">Add To</label>
      <div className="flex items-center justify-between">
        <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement="bottom-end">
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef.current.hide();
              handleValuePlacementChange('headers');
            }}
          >
            Headers
          </div>
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef.current.hide();
              handleValuePlacementChange('queryparams');
            }}
          >
            Query Params
          </div>
        </Dropdown>
      </div>
    </StyledWrapper>
  );
};

export default ApiKeyAuth;
