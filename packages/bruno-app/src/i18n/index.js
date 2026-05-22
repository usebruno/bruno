import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import translationEn from './translation/en.json';
import translationVi from './translation/vi.json';

const resources = {
  en: {
    translation: translationEn
  },
  vi: {
    translation: translationVi
  }
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: 'en', // Use "en" as the default language. "cimode" can be used to debug / show translation placeholder

    ns: 'translation', // Use translation as the default Namespace that will be loaded by default

    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
