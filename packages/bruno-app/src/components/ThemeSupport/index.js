import React from 'react';
import Modal from 'components/Modal/index';
import StyledWrapper from './StyledWrapper';
import { useTheme } from 'styled-components';

const ThemeSupport = ({ onClose }) => {
  const { storedTheme, themeKeys, setStoredTheme } = useTheme();

  const handleThemeChange = (e) => {
    setStoredTheme(e.target.value);
  };

  return (
    <StyledWrapper>
      <Modal size="sm" title={'Support'} handleCancel={onClose} hideFooter={true}>
        <div className="collection-options">
          <select name="theme_switcher" onChange={handleThemeChange} defaultValue={storedTheme}>
            {themeKeys.map((tk, index) => {
              return (
                <option value={tk} key={index}>
                  {tk}
                </option>
              );
            })}
          </select>
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default ThemeSupport;
