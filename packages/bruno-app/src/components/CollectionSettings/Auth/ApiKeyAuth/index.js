import React, { useRef, forwardRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import get from 'lodash/get';
import { IconCaretDown } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import { useTheme } from 'providers/Theme';
import SingleLineEditor from 'components/SingleLineEditor';
import SensitiveFieldWarning from 'components/SensitiveFieldWarning';
import { useDetectSensitiveField } from 'hooks/useDetectSensitiveField';
import { updateCollectionAuth } from 'providers/ReduxStore/slices/collections';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import { humanizeRequestAPIKeyPlacement } from 'utils/collections';

const ApiKeyAuth = ({ collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  const apikeyAuth = collection.draft?.root ? get(collection, 'draft.root.request.auth.apikey', {}) : get(collection, 'root.request.auth.apikey', {});
  const { isSensitive } = useDetectSensitiveField(collection);
  const apiKeyValueSensitive = isSensitive(apikeyAuth.value);

  const handleSave = () => dispatch(saveCollectionSettings(collection.uid));

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
      updateCollectionAuth({
        mode: 'apikey',
        collectionUid: collection.uid,
        content: {
          ...apikeyAuth,
          [property]: value
        }
      })
    );
  };

  useEffect(() => {
    !apikeyAuth?.placement
    && dispatch(
      updateCollectionAuth({
        mode: 'apikey',
        collectionUid: collection.uid,
        content: {
          placement: 'header'
        }
      })
    );
  }, [apikeyAuth]);

  return (
    <StyledWrapper className="mt-2 w-full">
      <label className="block mb-1">Key</label>
      <div className="single-line-editor-wrapper mb-3">
        <SingleLineEditor
          value={apikeyAuth.key || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleAuthChange('key', val)}
          collection={collection}
          isCompact
        />
      </div>

      <label className="block mb-1">Value</label>
      <div className="single-line-editor-wrapper mb-3 flex items-center">
        <SingleLineEditor
          value={apikeyAuth.value || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleAuthChange('value', val)}
          collection={collection}
          isSecret={true}
          isCompact
        />
        {apiKeyValueSensitive.showWarning && (
          <SensitiveFieldWarning fieldName="apikey-value" warningMessage={apiKeyValueSensitive.warningMessage} />
        )}
      </div>

      <label className="block mb-1">Add To</label>
      <div className="inline-flex items-center cursor-pointer auth-placement-selector w-fit">
        <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement="bottom-end">
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef.current.hide();
              handleAuthChange('placement', 'header');
            }}
          >
            Header
          </div>
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef.current.hide();
              handleAuthChange('placement', 'queryparams');
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
