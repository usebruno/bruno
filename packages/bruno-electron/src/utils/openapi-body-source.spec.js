const path = require('node:path');
const { resolveOpenApiBodySourcePath } = require('./openapi-body-source');

describe('resolveOpenApiBodySourcePath', () => {
  it('resolves body:openapi source relative to the request file', () => {
    expect(resolveOpenApiBodySourcePath({
      collectionPath: '/workspace/collection',
      requestPath: '/workspace/collection/requests/newpay/create.bru',
      sourceUrl: '../../../../../../kassagate/pkg/api/external/newpay/openapi.yaml'
    })).toBe(path.resolve(
      '/workspace/collection/requests/newpay',
      '../../../../../../kassagate/pkg/api/external/newpay/openapi.yaml'
    ));
  });

  it('keeps collection-relative behavior without request context', () => {
    expect(resolveOpenApiBodySourcePath({
      collectionPath: '/workspace/collection',
      sourceUrl: '../openapi.yaml'
    })).toBe('/workspace/openapi.yaml');
  });

  it('does not modify absolute paths', () => {
    expect(resolveOpenApiBodySourcePath({
      collectionPath: '/workspace/collection',
      requestPath: '/workspace/collection/request.bru',
      sourceUrl: '/specs/openapi.yaml'
    })).toBe('/specs/openapi.yaml');
  });
});
