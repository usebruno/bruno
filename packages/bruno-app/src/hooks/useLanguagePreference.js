import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

const useLanguagePreference = () => {
  const preferences = useSelector((state) => state.app.preferences);
  const { i18n } = useTranslation();

  useEffect(() => {
    const savedLanguage = preferences?.language;
    if (savedLanguage && savedLanguage !== i18n.language) {
      i18n.changeLanguage(savedLanguage);
    }
  }, [preferences?.language, i18n]);
};

export default useLanguagePreference;
