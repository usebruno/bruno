const getInputsConfig = (t) => [
  {
    key: 'authorizationUrl',
    label: t('REQUEST_PANE.AUTHORIZATION_URL')
  },
  {
    key: 'accessTokenUrl',
    label: t('REQUEST_PANE.ACCESS_TOKEN_URL')
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
  },
  {
    key: 'state',
    label: t('REQUEST_PANE.STATE')
  }
];

export { getInputsConfig };
