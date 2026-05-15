import { useTranslation } from 'react-i18next';

const getInputsConfig = () => {
  const { t } = useTranslation();
  return [
    {
      key: 'accessTokenUrl',
      label: t('REQUEST_AUTH.ACCESS_TOKEN_URL')
    },
    {
      key: 'username',
      label: t('REQUEST_AUTH.USERNAME')
    },
    {
      key: 'password',
      label: t('REQUEST_AUTH.PASSWORD'),
      isSecret: true
    },
    {
      key: 'clientId',
      label: t('REQUEST_AUTH.CLIENT_ID')
    },
    {
      key: 'clientSecret',
      label: t('REQUEST_AUTH.CLIENT_SECRET'),
      isSecret: true
    },
    {
      key: 'scope',
      label: t('REQUEST_AUTH.SCOPE')
    }
  ];
};

export { getInputsConfig };
