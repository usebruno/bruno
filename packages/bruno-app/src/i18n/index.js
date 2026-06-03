import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import translationEn from './translation/en.json';
import translationZh from './translation/zh.json';

const getStoredLanguage = () => {
  try {
    const stored = localStorage.getItem('bruno-language');
    if (stored && (stored === 'zh' || stored === 'en')) {
      return stored;
    }
  } catch (e) {}
  return 'zh';
};

const resources = {
  en: {
    translation: translationEn
  },
  zh: {
    translation: translationZh
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getStoredLanguage(),

    fallbackLng: 'en',

    ns: 'translation',

    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
