import React, { useRef, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { IconCaretDown } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import { humanizeRequestBodyMode } from 'utils/collections';
import StyledWrapper from './StyledWrapper';

const RAW_MODES = [
  {
    label: 'BODY_MODE.JSON',
    key: 'json'
  },
  {
    label: 'BODY_MODE.XML',
    key: 'xml'
  },
  {
    label: 'BODY_MODE.TEXT',
    key: 'text'
  }
];

const WSRequestBodyMode = ({ mode, onModeChange }) => {
  const { t } = useTranslation();
  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);

  const Icon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="flex items-center justify-center pl-3 py-1 select-none selected-body-mode">
        {humanizeRequestBodyMode(mode, t)}
        {' '}
        <IconCaretDown className="caret ml-2" size={14} strokeWidth={2} />
      </div>
    );
  });

  return (
    <StyledWrapper>
      <div className="inline-flex items-center cursor-pointer body-mode-selector">
        <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement="bottom-end">
          <div className="label-item font-medium">{t('BODY_MODE.RAW')}</div>
          {RAW_MODES.map((d) => (
            <div
              className="dropdown-item"
              key={d.key}
              onClick={() => {
                dropdownTippyRef.current.hide();
                onModeChange(d.key);
              }}
            >
              {t(d.label)}
            </div>
          ))}
        </Dropdown>
      </div>
    </StyledWrapper>
  );
};
export default WSRequestBodyMode;
