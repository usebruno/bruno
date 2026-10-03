import { describe, it, expect } from '@jest/globals';
import openApiToBruno from '../../../src/openapi/openapi-to-bruno';

describe('openapi-to-bruno links', () => {
  it('converts response body runtime JSON Pointers into valid response scripts', () => {
    const spec = `
openapi: 3.0.3
info:
  title: Links API
  version: '1.0'
paths:
  /orders:
    post:
      operationId: createOrder
      responses:
        '201':
          description: Created
          links:
            GetOrder:
              operationId: getOrder
              parameters:
                root: '$response.body'
                emptyPointer: '$response.body#'
                rootPointer: '$response.body#/'
                id: '$response.body#/data/0/id'
                hyphenated: '$response.body#/user-name'
                escaped: '$response.body#/links/self~1href/meta~0key'
servers:
  - url: https://example.com
`;

    const collection = openApiToBruno(spec);
    const request = collection.items[0];

    expect(request.request.script.res).toBe(
      [
        'if (res.status === 201) {',
        '  bru.setVar(\'getOrder_root\', res.body);',
        '  bru.setVar(\'getOrder_emptyPointer\', res.body);',
        '  bru.setVar(\'getOrder_rootPointer\', res.body);',
        '  bru.setVar(\'getOrder_id\', res.body.data[0].id);',
        '  bru.setVar(\'getOrder_hyphenated\', res.body["user-name"]);',
        '  bru.setVar(\'getOrder_escaped\', res.body.links["self/href"]["meta~key"]);',
        '}'
      ].join('\n')
    );
  });
});
