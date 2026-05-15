import React, { useMemo } from 'react';
import { IconCaretDown, IconForms, IconBraces, IconCode, IconFileText, IconDatabase, IconFile, IconX } from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import { humanizeRequestBodyMode } from 'utils/collections';
import StyledWrapper from './StyledWrapper';
import { useTranslation } from 'react-i18next';

const BodyModeSelector = ({
  currentMode,
  onModeChange,
  modes,
  disabled = false,
  className = '',
  wrapperClassName = '',
  placement = 'bottom-end'
}) => {
  const { t } = useTranslation();

  const defaultModes = [
    {
      name: t('BODY_MODE.FORM'),
      options: [
        { id: 'multipartForm', label: t('BODY_MODE.MULTIPART_FORM'), leftSection: IconForms },
        { id: 'formUrlEncoded', label: t('BODY_MODE.FORM_URL_ENCODED'), leftSection: IconForms }
      ]
    },
    {
      name: t('BODY_MODE.RAW'),
      options: [
        { id: 'json', label: t('BODY_MODE.JSON'), leftSection: IconBraces },
        { id: 'xml', label: t('BODY_MODE.XML'), leftSection: IconCode },
        { id: 'text', label: t('BODY_MODE.TEXT'), leftSection: IconFileText },
        { id: 'sparql', label: t('BODY_MODE.SPARQL'), leftSection: IconDatabase }
      ]
    },
    {
      name: t('BODY_MODE.OTHER'),
      options: [
        { id: 'file', label: t('BODY_MODE.FILE_BINARY'), leftSection: IconFile },
        { id: 'none', label: t('BODY_MODE.NO_BODY'), leftSection: IconX }
      ]
    }
  ];

  const effectiveModes = modes || defaultModes;
  // Add onClick handlers to mode options
  const menuItems = useMemo(() => {
    return effectiveModes.map((group) => ({
      ...group,
      options: group.options.map((option) => ({
        ...option,
        onClick: () => onModeChange(option.id)
      }))
    }));
  }, [effectiveModes, onModeChange]);

  return (
    <StyledWrapper className={wrapperClassName}>
      <div className={`inline-flex items-center body-mode-selector ${disabled ? 'cursor-default' : 'cursor-pointer'}`}>
        <MenuDropdown
          items={menuItems}
          placement={placement}
          disabled={disabled}
          className={className}
          selectedItemId={currentMode}
          showGroupDividers={false}
          groupStyle="select"
        >
          <div className="flex items-center justify-center pl-3 py-1 select-none selected-body-mode">
            {humanizeRequestBodyMode(currentMode, t)}
            {' '}
            <IconCaretDown className="caret ml-2" size={14} strokeWidth={2} />
          </div>
        </MenuDropdown>
      </div>
    </StyledWrapper>
  );
};

export default BodyModeSelector;
