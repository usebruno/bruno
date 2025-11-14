import { describe, it, expect } from '@jest/globals';
import insomniaToBruno from '../../src/insomnia/insomnia-to-bruno';

describe('insomnia-collection v5 with date and non-string parameters', () => {
  it('should handle date query parameters without crashing', () => {
    const insomniaYAML = `
type: collection.insomnia.rest/5.0
name: MyCollection
collection:
  - url: https://example.com/api
    name: Request with date param
    method: GET
    parameters:
      - id: pair_1
        name: from
        value: 2025-10-03
        description: ""
        disabled: false
      - id: pair_2
        name: to
        value: 2025-12-31
        description: ""
        disabled: false
`;

    const result = insomniaToBruno(insomniaYAML);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].request.params).toHaveLength(2);
    expect(result.items[0].request.params[0].name).toBe('from');
    expect(result.items[0].request.params[0].value).toBe('2025-10-03');
    expect(result.items[0].request.params[1].name).toBe('to');
    expect(result.items[0].request.params[1].value).toBe('2025-12-31');
  });

  it('should handle the exact example from issue #6095', () => {
    // This is the exact YAML from the bug report
    const insomniaYAML = `
type: collection.insomnia.rest/5.0
name: MyCollection
meta:
  id: wrk_08e7d90dbce84c84a3ef1edbd8ce1f2e
  created: 1763064992994
  modified: 1763065106803
  description: ""
collection:
  - url: https://example.com/
    name: MyRequest
    meta:
      id: req_677b954dd81c46ef90e405e36d2eb727
      created: 1763064997489
      modified: 1763065097890
      isPrivate: false
      description: ""
      sortKey: -1763064997489
    method: GET
    parameters:
      - id: pair_3db0e0ba07ff4823b85d48208a57c874
        name: from
        value: 2025-10-03
        description: ""
        disabled: false
    headers:
      - name: User-Agent
        value: insomnia/11.6.2
    settings:
      renderRequestBody: true
      encodeUrl: true
      followRedirects: global
      cookies:
        send: true
        store: true
      rebuildPath: true
`;

    // Should not throw TypeError
    expect(() => {
      const result = insomniaToBruno(insomniaYAML);
      expect(result.items[0].request.params[0].name).toBe('from');
      expect(result.items[0].request.params[0].value).toBe('2025-10-03');
    }).not.toThrow();
  });

  it('should handle date path parameters', () => {
    const insomniaYAML = `
type: collection.insomnia.rest/5.0
name: MyCollection
collection:
  - url: https://example.com/api/:date
    name: Request with date path param
    method: GET
    pathParameters:
      - name: date
        value: 2025-10-03
`;

    const result = insomniaToBruno(insomniaYAML);

    expect(result.items[0].request.params[0].type).toBe('path');
    expect(result.items[0].request.params[0].value).toBe('2025-10-03');
  });

  it('should handle number query parameters', () => {
    const insomniaYAML = `
type: collection.insomnia.rest/5.0
name: MyCollection
collection:
  - url: https://example.com/api
    name: Request with number param
    method: GET
    parameters:
      - name: limit
        value: 100
      - name: offset
        value: 0
      - name: page
        value: 1
`;

    const result = insomniaToBruno(insomniaYAML);

    expect(result.items[0].request.params[0].value).toBe('100');
    expect(result.items[0].request.params[1].value).toBe('0');
    expect(result.items[0].request.params[2].value).toBe('1');
  });

  it('should handle boolean query parameters', () => {
    const insomniaYAML = `
type: collection.insomnia.rest/5.0
name: MyCollection
collection:
  - url: https://example.com/api
    name: Request with boolean param
    method: GET
    parameters:
      - name: active
        value: true
      - name: deleted
        value: false
`;

    const result = insomniaToBruno(insomniaYAML);

    expect(result.items[0].request.params[0].value).toBe('true');
    expect(result.items[0].request.params[1].value).toBe('false');
  });

  it('should preserve variable syntax in values', () => {
    const insomniaYAML = `
type: collection.insomnia.rest/5.0
name: MyCollection
collection:
  - url: https://example.com/{{_.host}}
    name: Request with variables
    method: GET
    parameters:
      - name: date
        value: "{{_.startDate}}"
      - name: apiKey
        value: "{{_.apiKey}}"
`;

    const result = insomniaToBruno(insomniaYAML);

    // Variable normalization should convert {{_.host}} to {{host}}
    expect(result.items[0].request.url).toBe('https://example.com/{{host}}');
    expect(result.items[0].request.params[0].value).toBe('{{startDate}}');
    expect(result.items[0].request.params[1].value).toBe('{{apiKey}}');
  });

  it('should handle datetime values with time component', () => {
    const insomniaYAML = `
type: collection.insomnia.rest/5.0
name: MyCollection
collection:
  - url: https://example.com/api
    name: Request with datetime
    method: GET
    parameters:
      - name: timestamp
        value: 2025-10-03T14:30:00Z
`;

    const result = insomniaToBruno(insomniaYAML);

    // Should preserve full ISO string for datetime values
    expect(result.items[0].request.params[0].value).toMatch(/2025-10-03T\d{2}:\d{2}:\d{2}/);
  });

  it('should handle form-urlencoded body with date values', () => {
    const insomniaYAML = `
type: collection.insomnia.rest/5.0
name: MyCollection
collection:
  - url: https://example.com/api
    name: Form with date
    method: POST
    body:
      mimeType: application/x-www-form-urlencoded
      params:
        - name: startDate
          value: 2025-10-03
        - name: count
          value: 42
        - name: enabled
          value: true
`;

    const result = insomniaToBruno(insomniaYAML);

    expect(result.items[0].request.body.formUrlEncoded[0].value).toBe('2025-10-03');
    expect(result.items[0].request.body.formUrlEncoded[1].value).toBe('42');
    expect(result.items[0].request.body.formUrlEncoded[2].value).toBe('true');
  });

  it('should handle multipart form data with date values', () => {
    const insomniaYAML = `
type: collection.insomnia.rest/5.0
name: MyCollection
collection:
  - url: https://example.com/api
    name: Multipart form with date
    method: POST
    body:
      mimeType: multipart/form-data
      params:
        - name: birthDate
          value: 1990-05-15
        - name: age
          value: 35
`;

    const result = insomniaToBruno(insomniaYAML);

    expect(result.items[0].request.body.multipartForm[0].value).toBe('1990-05-15');
    expect(result.items[0].request.body.multipartForm[1].value).toBe('35');
  });

  it('should handle headers with date values', () => {
    const insomniaYAML = `
type: collection.insomnia.rest/5.0
name: MyCollection
collection:
  - url: https://example.com/api
    name: Request with date header
    method: GET
    headers:
      - name: If-Modified-Since
        value: 2025-01-01
      - name: X-Custom-Number
        value: 12345
`;

    const result = insomniaToBruno(insomniaYAML);

    expect(result.items[0].request.headers[0].value).toBe('2025-01-01');
    expect(result.items[0].request.headers[1].value).toBe('12345');
  });

  it('should handle null and undefined values gracefully', () => {
    const insomniaYAML = `
type: collection.insomnia.rest/5.0
name: MyCollection
collection:
  - url: https://example.com/api
    name: Request with null/empty params
    method: GET
    parameters:
      - name: emptyParam
        value: ""
      - name: nullParam
        value: null
`;

    const result = insomniaToBruno(insomniaYAML);

    // Both should be converted to empty strings
    expect(result.items[0].request.params[0].value).toBe('');
    expect(result.items[0].request.params[1].value).toBe('');
  });

  it('should handle mixed types in the same request', () => {
    const insomniaYAML = `
type: collection.insomnia.rest/5.0
name: MyCollection
collection:
  - url: https://example.com/api
    name: Mixed types request
    method: POST
    parameters:
      - name: date
        value: 2025-10-03
      - name: count
        value: 100
      - name: active
        value: true
      - name: name
        value: "John Doe"
    body:
      mimeType: application/json
      text: '{"key": "value"}'
`;

    const result = insomniaToBruno(insomniaYAML);

    expect(result.items[0].request.params[0].value).toBe('2025-10-03');
    expect(result.items[0].request.params[1].value).toBe('100');
    expect(result.items[0].request.params[2].value).toBe('true');
    expect(result.items[0].request.params[3].value).toBe('John Doe');
  });

  it('should handle basic auth with non-string values', () => {
    const insomniaYAML = `
type: collection.insomnia.rest/5.0
name: MyCollection
collection:
  - url: https://example.com/api
    name: Request with basic auth
    method: GET
    authentication:
      type: basic
      username: admin
      password: 12345
`;

    const result = insomniaToBruno(insomniaYAML);

    expect(result.items[0].request.auth.mode).toBe('basic');
    expect(result.items[0].request.auth.basic.username).toBe('admin');
    expect(result.items[0].request.auth.basic.password).toBe('12345');
  });
});
