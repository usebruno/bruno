import get from 'lodash/get';

export const getAuthHeaders = (collectionRootAuth, requestAuth) => {
  const auth = collectionRootAuth && ['inherit', 'none'].includes(requestAuth.mode) ? collectionRootAuth : requestAuth;

  if (auth.mode === 'basic') {
    const username = get(auth, 'basic.username');
    const password = get(auth, 'basic.password');
    const basicToken = Buffer.from(`${username}:${password}`).toString('base64');

    return [
      {
        enabled: true,
        name: 'Authorization',
        value: `Basic ${basicToken}`
      }
    ];
  } else if (auth.mode === 'bearer') {
    return [
      {
        enabled: true,
        name: 'Authorization',
        value: `Bearer ${get(auth, 'bearer.token')}`
      }
    ];
  }

  return [];
};
