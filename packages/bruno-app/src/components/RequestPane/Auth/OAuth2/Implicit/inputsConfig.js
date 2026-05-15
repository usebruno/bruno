import { useTranslation } from 'react-i18next';

const getInputsConfig = () => {
  const { t } = useTranslation();
  return [
    {
      key: 'authorizationUrl',
      label: t('REQUEST_AUTH.AUTHORIZATION_URL')
    },
    {
      key: 'clientId',
      label: t('REQUEST_AUTH.CLIENT_ID')
    },
    {
      key: 'scope',
      label: t('REQUEST_AUTH.SCOPE')
    },
    {
      key: 'state',
      label: t('REQUEST_AUTH.STATE')
    }
  ];
};

export { getInputsConfig };
