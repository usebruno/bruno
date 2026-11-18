import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { get } from 'lodash';
import { IconChevronDown } from '@tabler/icons';
import { updateCollectionHttpVersion } from 'providers/ReduxStore/slices/collections';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import Button from 'ui/Button';
import MenuDropdown from 'ui/MenuDropdown';
import StatusBadge from 'ui/StatusBadge';
import FormField from 'ui/patterns/FormField';
import FieldList from 'ui/patterns/FieldList';
import SettingsHeader from '../SettingsHeader';
import StyledWrapper from './StyledWrapper';

// Display labels for the concrete HTTP versions (Inherit shows the resolved app value).
const HTTP_VERSION_LABELS = {
  auto: 'Auto',
  http1: 'HTTP/1.1',
  http2: 'HTTP/2'
};

const HttpSettings = ({ collection }) => {
  const dispatch = useDispatch();

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
    { id: 'auto', label: HTTP_VERSION_LABELS.auto, onClick: () => handleHttpVersionChange('auto') },
    { id: 'http1', label: HTTP_VERSION_LABELS.http1, onClick: () => handleHttpVersionChange('http1') },
    { id: 'http2', label: HTTP_VERSION_LABELS.http2, onClick: () => handleHttpVersionChange('http2') }
  ];
  const currentLabel = httpVersionItems.find((option) => option.id === currentHttpVersion)?.label || httpVersionItems[0].label;

  const handleSave = () => dispatch(saveCollectionSettings(collection.uid));

  return (
    <StyledWrapper className="h-full w-full">
      <FieldList className="http-settings bruno-form">
        <SettingsHeader title="HTTP Settings" description="Configure HTTP options for this collection." />
        <FormField
          label={(
            <span className="inline-flex items-center gap-2">
              HTTP Version
              <StatusBadge status="info" size="xs">Beta</StatusBadge>
            </span>
          )}
          labelId="collection-http-version-label"
          description="Choose the HTTP version for this collection. Select Inherit to use the app default."
          descriptionId="collection-http-version-description"
        >
          <div className="http-version-dropdown">
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
                id="collection-http-version-trigger"
                className="http-version-trigger"
                aria-labelledby="collection-http-version-label collection-http-version-trigger"
                aria-describedby="collection-http-version-description"
                data-testid="collection-http-version"
              >
                <span>{currentLabel}</span>
                <IconChevronDown className="caret" size={14} strokeWidth={2} />
              </button>
            </MenuDropdown>
          </div>
        </FormField>
        <Button type="button" size="base" className="self-start mt-2" data-testid="collection-requests-save-btn" onClick={handleSave}>
          Save
        </Button>
      </FieldList>
    </StyledWrapper>
  );
};

export default HttpSettings;
