import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Tippy from '@tippyjs/react';
import { IconCheck, IconLanguage } from '@tabler/icons';
import i18n from '../../../i18n';
import StyledWrapper from './StyledWrapper';

const LANGUAGES = [
  { code: 'zh', labelKey: 'STATUS_BAR.LANGUAGE_ZH' },
  { code: 'en', labelKey: 'STATUS_BAR.LANGUAGE_EN' }
];

const LanguageDropdown = ({ children }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = i18n.language || i18n.languages?.[0] || 'zh';

  const handleLanguageSelect = (langCode) => {
    i18n.changeLanguage(langCode);
    try {
      localStorage.setItem('bruno-language', langCode);
    } catch (e) {}
    setIsOpen(false);
  };

  const menuContent = (
    <StyledWrapper>
      <div className="language-menu" role="menu" aria-label={t('STATUS_BAR.LANGUAGE')}>
        {LANGUAGES.map((lang) => (
          <div
            key={lang.code}
            className={`language-item ${currentLanguage === lang.code ? 'active' : ''}`}
            role="menuitem"
            tabIndex={0}
            onClick={() => handleLanguageSelect(lang.code)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleLanguageSelect(lang.code);
              }
            }}
          >
            <span>{t(lang.labelKey)}</span>
            {currentLanguage === lang.code && <IconCheck size={14} strokeWidth={2} />}
          </div>
        ))}
      </div>
    </StyledWrapper>
  );

  return (
    <Tippy
      content={menuContent}
      placement="top-start"
      interactive
      arrow={false}
      animation={false}
      visible={isOpen}
      onClickOutside={() => setIsOpen(false)}
      appendTo="parent"
    >
      <div onClick={() => setIsOpen(!isOpen)}>
        {children}
      </div>
    </Tippy>
  );
};

export default LanguageDropdown;
