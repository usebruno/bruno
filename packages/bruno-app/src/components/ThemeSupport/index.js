import React from 'react';
import Modal from 'components/Modal/index';
import StyledWrapper from './StyledWrapper';
import { useTheme } from 'providers/Theme';

const ThemeSupport = ({ onClose }) => {
  const { storedTheme, themeOptions, setStoredTheme } = useTheme();

  console.log(themeOptions);

  const handleThemeChange = (e) => {
    setStoredTheme(e.target.value);
  };

  return (
    <StyledWrapper>
      <Modal size="sm" title={'Support'} handleCancel={onClose} hideFooter={true}>
        <div className="collection-options">
          <select name="theme_switcher" onChange={handleThemeChange} defaultValue={storedTheme}>
            {themeOptions.map((tk, index) => {
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
