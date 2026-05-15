import React, { useRef, forwardRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import get from 'lodash/get';
import { IconCaretDown } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import { useTheme } from 'providers/Theme';
import SingleLineEditor from 'components/SingleLineEditor';
import { updateCollectionAuth } from 'providers/ReduxStore/slices/collections';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import { humanizeRequestAPIKeyPlacement } from 'utils/collections';

const ApiKeyAuth = ({ collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const { t } = useTranslation();
  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  const apikeyAuth = collection.draft?.root ? get(collection, 'draft.root.request.auth.apikey', {}) : get(collection, 'root.request.auth.apikey', {});

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
      <label className="block mb-1">{t('COLLECTION_AUTH.KEY')}</label>
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

      <label className="block mb-1">{t('COLLECTION_AUTH.VALUE')}</label>
      <div className="single-line-editor-wrapper mb-3">
        <SingleLineEditor
          value={apikeyAuth.value || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => handleAuthChange('value', val)}
          collection={collection}
          isCompact
        />
      </div>

      <label className="block mb-1">{t('COLLECTION_AUTH.ADD_TO')}</label>
      <div className="inline-flex items-center cursor-pointer auth-placement-selector w-fit">
        <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement="bottom-end">
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef.current.hide();
              handleAuthChange('placement', 'header');
            }}
          >
            {t('COLLECTION_AUTH.HEADER')}
          </div>
          <div
            className="dropdown-item"
            onClick={() => {
              dropdownTippyRef.current.hide();
              handleAuthChange('placement', 'queryparams');
            }}
          >
            {t('COLLECTION_AUTH.QUERY_PARAMS')}
          </div>
        </Dropdown>
      </div>
    </StyledWrapper>
  );
};

export default ApiKeyAuth;
