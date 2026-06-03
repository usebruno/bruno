const getInputsConfig = (t) => [
  {
    key: 'authorizationUrl',
    label: t('REQUEST_PANE.AUTHORIZATION_URL')
  },
  {
    key: 'clientId',
    label: t('REQUEST_PANE.CLIENT_ID')
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
