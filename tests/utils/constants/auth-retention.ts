export const collectionName = 'Auth retention';
export const folderName = 'Team';

export const requests = {
  noAuth: 'Remove authentication',
  discard: 'Discard auth draft',
  inheritance: 'Inherit authentication',
  switchModes: 'Switch auth modes'
};

export const echoPath = '/api/echo/everything';

export const credentials = {
  apiKey: {
    key: 'api_key',
    requestValue: 'request-api-key',
    folderValue: 'folder-api-key',
    collectionValue: 'collection-api-key',
    sequenceValue: 'saved-api-key',
    partialKey: 'draft_api_key'
  },
  basic: { username: 'basic-user', password: 'basic-password' },
  digest: { username: 'digest-user', password: 'digest-password' },
  bearer: { saved: 'saved-bearer-token', draft: 'draft-bearer-token', replacement: 'new-bearer-token' },
  awsAccessKeyId: 'draft-access-key'
};
