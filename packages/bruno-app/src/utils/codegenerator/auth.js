import get from 'lodash/get';

export const getAuthHeaders = (collectionRootAuth, requestAuth) => {

  // Discovered edge case where code generation fails when you create a collection which has not been saved yet:
  // Collection auth therefore null, and request inherits from collection, therefore it is also null
  // TypeError: Cannot read properties of undefined (reading 'mode')
  //     at getAuthHeaders
  if (!collectionRootAuth && !requestAuth) {
    return [];
  }

  const auth = collectionRootAuth && ['inherit'].includes(requestAuth?.mode) ? collectionRootAuth : requestAuth;

  switch (auth.mode) {
    case 'basic':
      const username = get(auth, 'basic.username', '');
      const password = get(auth, 'basic.password', '');
      const basicToken = Buffer.from(`${username}:${password}`).toString('base64');

      return [
        {
          enabled: true,
          name: 'Authorization',
          value: `Basic ${basicToken}`
        }
      ];
    case 'bearer':
      return [
        {
          enabled: true,
          name: 'Authorization',
          value: `Bearer ${get(auth, 'bearer.token', '')}`
        }
      ];
    case 'apikey':
      const key = get(auth, 'apikey.key', '');
      const value = get(auth, 'apikey.value', '');
      const addTo = get(auth, 'apikey.addTo', 'header');
      
      if (addTo === 'header') {
        return [
          {
            enabled: true,
            name: key,
            value: value
          }
        ];
      }
      return [];
    case 'oauth2':
      return [
        {
          enabled: true,
          name: 'Authorization',
          value: `OAuth ${get(auth, 'oauth2.accessToken', '')}`
        }
      ];
    case 'digest':
      const digestAuth = get(auth, 'digest', {});
      return [
        {
          enabled: true,
          name: 'Authorization',
          value: `Digest username="${digestAuth.username || ''}", realm="${digestAuth.realm || ''}", nonce="${digestAuth.nonce || ''}", uri="${digestAuth.uri || ''}", response="${digestAuth.response || ''}", qop="${digestAuth.qop || ''}", nc="${digestAuth.nc || ''}", cnonce="${digestAuth.cnonce || ''}"`
        }
      ];
    case 'awsv4':
      const awsAuth = get(auth, 'awsv4', {});
      return [
        {
          enabled: true,
          name: 'Authorization',
          value: `AWS4-HMAC-SHA256 Credential=${awsAuth.accessKey || ''}/${awsAuth.date || ''}/region/service/aws4_request, SignedHeaders=host;x-amz-date, Signature=${awsAuth.signature || ''}`
        },
        {
          enabled: true,
          name: 'X-Amz-Date',
          value: awsAuth.date || ''
        }
      ];
    default:
      return [];
  }
};
