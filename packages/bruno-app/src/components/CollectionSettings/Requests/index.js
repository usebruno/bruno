import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { get } from 'lodash';
import { IconChevronDown } from '@tabler/icons';
import { updateCollectionHttpVersion } from 'providers/ReduxStore/slices/collections';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import Button from 'ui/Button';
import MenuDropdown from 'ui/MenuDropdown';
import StyledWrapper from './StyledWrapper';

// Display labels for the concrete HTTP versions (Inherit shows the resolved app value).
const HTTP_VERSION_LABELS = {
  auto: 'Auto',
  http1: 'HTTP/1.1',
  http2: 'HTTP/2'
};

const Requests = ({ collection }) => {
  const dispatch = useDispatch();
  const { theme } = useTheme();

  const currentHttpVersion = collection.draft?.brunoConfig
    ? get(collection, 'draft.brunoConfig.http.version', 'inherit')
    : get(collection, 'brunoConfig.http.version', 'inherit');

  // A collection set to inherit resolves to the app preference.
  const appHttpVersion = useSelector((state) => get(state.app.preferences, 'request.httpVersion', 'http1'));

  const handleHttpVersionChange = (value) => {
    dispatch(updateCollectionHttpVersion({ collectionUid: collection.uid, httpVersion: value }));
  };

  const httpVersionItems = [
    {
      id: 'inherit',
      label: `Inherit (${HTTP_VERSION_LABELS[appHttpVersion] || appHttpVersion})`,
      onClick: () => handleHttpVersionChange('inherit')
    },
    { id: 'auto', label: HTTP_VERSION_LABELS['auto'], onClick: () => handleHttpVersionChange('auto') },
    { id: 'http1', label: HTTP_VERSION_LABELS['http1'], onClick: () => handleHttpVersionChange('http1') },
    { id: 'http2', label: HTTP_VERSION_LABELS['http2'], onClick: () => handleHttpVersionChange('http2') }
  ];
  const currentLabel = httpVersionItems.find((option) => option.id === currentHttpVersion)?.label || httpVersionItems[0].label;

  const handleSave = () => dispatch(saveCollectionSettings(collection.uid));

  return (
    <StyledWrapper className="h-full w-full">
      <div className="bruno-form">
        <div className="http-version-field">
          <label className="http-version-label">HTTP Version</label>
          <p className="http-version-subtitle">
            Choose the HTTP version for this collection. Select <strong>Inherit</strong> to use the app default.
          </p>
          <MenuDropdown
            items={httpVersionItems}
            selectedItemId={currentHttpVersion}
            placement="bottom-start"
            appendTo={() => document.body}
            popperOptions={{ strategy: 'fixed' }}
            sameWidth
          >
            <button
              type="button"
              className="flex items-center justify-between rounded-sm px-2 py-1 h-8 w-64 outline-none cursor-pointer"
              style={{ backgroundColor: theme.input.bg, border: `1px solid ${theme.input.border}` }}
              data-testid="collection-http-version"
            >
              <span>{currentLabel}</span>
              <IconChevronDown className="caret" size={16} strokeWidth={1.5} />
            </button>
          </MenuDropdown>
        </div>

        <div className="mt-6">
          <Button type="button" size="sm" data-testid="collection-requests-save-btn" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Requests;
