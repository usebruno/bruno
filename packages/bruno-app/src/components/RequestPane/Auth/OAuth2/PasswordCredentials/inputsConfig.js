const getInputsConfig = (t) => [
  {
    key: 'accessTokenUrl',
    label: t('REQUEST_PANE.ACCESS_TOKEN_URL')
  },
  {
    key: 'username',
    label: t('REQUEST_PANE.USERNAME')
  },
  {
    key: 'password',
    label: t('REQUEST_PANE.PASSWORD'),
    isSecret: true
  },
  {
    key: 'clientId',
    label: t('REQUEST_PANE.CLIENT_ID')
  },
  {
    key: 'clientSecret',
    label: t('REQUEST_PANE.CLIENT_SECRET'),
    isSecret: true
  },
  {
    key: 'scope',
    label: t('REQUEST_PANE.SCOPE')
  }
];

export { getInputsConfig };
