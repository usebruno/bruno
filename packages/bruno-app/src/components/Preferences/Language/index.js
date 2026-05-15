import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';
import { useTranslation } from 'react-i18next';

const Language = () => {
  const preferences = useSelector((state) => state.app.preferences);
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();

  const currentLanguage = i18n.language || 'en';

  const handleChangeLanguage = (lang) => {
    i18n.changeLanguage(lang);

    dispatch(
      savePreferences({
        ...preferences,
        language: lang
      })
    ).catch((err) => console.log(err));
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'zh', name: '简体中文' }
  ];

  return (
    <StyledWrapper className="w-full">
      <div className="section-header">{t('LANGUAGE.TITLE')}</div>
      <div className="mt-4">
        <label className="block select-none mb-2">{t('LANGUAGE.SELECT')}</label>
        <select
          className="block textbox w-48"
          value={currentLanguage}
          onChange={(e) => handleChangeLanguage(e.target.value)}
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>
    </StyledWrapper>
  );
};

export default Language;
