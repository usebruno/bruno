import React, { useRef, forwardRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import get from 'lodash/get';
import { IconCaretDown } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import { useTheme } from 'providers/Theme';
import SingleLineEditor from 'components/SingleLineEditor';
import { updateAuth } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import { humanizeRequestAPIKeyPlacement } from 'utils/collections';

const ApiKeyAuth = ({ item, collection, updateAuth, request, save }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  const apikeyAuth = get(request, 'auth.apikey', {});

  const handleRun = () => dispatch(sendRequest(item, collection.uid));
  
  const handleSave = () => {
    save();
  };

  const Icon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="flex items-center justify-end auth-type-label select-none">
        {humanizeRequestAPIKeyPlacement(apikeyAuth?.placement)}
        <IconCaretDown className="caret ml-1 mr-1" size={14} strokeWidth={2} />
      </div>
    );
  });

  const handleAuthChange = (property, value) => {
    dispatch(
      updateAuth({
        mode: 'apikey',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          ...apikeyAuth,
          [property]: value
        }
      })
    );
  };

  useEffect(() => {
    !apikeyAuth?.placement &&
      dispatch(
        updateAuth({
          mode: 'apikey',
          collectionUid: collection.uid,
          itemUid: item.uid,
          content: {
            placement: 'header'
          }
        })
      );
  }, [apikeyAuth]);

  return (
    <StyledWrapper className="mt-2 w-full">
      <div className="flex items-center mb-2">
        <div className="mr-4 font-medium">Add To</div>
        <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement="bottom-end">
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef?.current?.hide();
              handleAuthChange('placement', 'header');
            }}
          >
            Header
          </div>
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef?.current?.hide();
              handleAuthChange('placement', 'queryParam');
            }}
          >
            Query Param
          </div>
        </Dropdown>
      </div>

      <label className="block font-medium mb-2">Key</label>
      <div className="single-line-editor-wrapper mb-2">
        <SingleLineEditor
          value={apikeyAuth.key || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleAuthChange('key', val)}
          onRun={handleRun}
          collection={collection}
          item={item}
        />
      </div>

      <label className="block font-medium mb-2">Value</label>
      <div className="single-line-editor-wrapper">
        <SingleLineEditor
          value={apikeyAuth.value || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleAuthChange('value', val)}
          onRun={handleRun}
          collection={collection}
          item={item}
          isSecret={true}
        />
      </div>
    </StyledWrapper>
  );
};

export default ApiKeyAuth;
