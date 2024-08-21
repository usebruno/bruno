const { describe, it, expect } = require('@jest/globals');
import { convertCollection } from './postman-collection';

describe('exporter postman-collection', () => {
  it('should handle full https url with variables', () => {
    const brunoObj = {
      items: [
        {
          request: {
            url: 'https://{{hostname}}/path1/path2/:variableOne/path3/:variableTwo?queryparam1=test',
            method: 'GET',
            headers: [],
            params: [
              {
                name: 'queryparam1',
                value: 'q1',
                type: 'query',
                enabled: true
              },
              {
                name: 'variableOne',
                value: 'v1',
                type: 'path',
                enabled: true
              },
              {
                name: 'variableTwo',
                value: 'v2',
                type: 'path',
                enabled: true
              }
            ],
            body: {
              mode: 'none',
              formUrlEncoded: [],
              multipartForm: []
            }
          }
        }
      ]
    }
    const resultedUrl = convertCollection(brunoObj).item.at(0).request.url;

    expect(resultedUrl.raw).toEqual('https://{{hostname}}/path1/path2/:variableOne/path3/:variableTwo?queryparam1=test');
    expect(resultedUrl.protocol).toEqual('https');
    expect(resultedUrl.auth).toEqual(null);
    expect(resultedUrl.host).toEqual(['{{hostname}}']);
    expect(resultedUrl.path).toEqual(['path1', 'path2', ':variableOne', 'path3', ':variableTwo']);
    expect(resultedUrl.query.at(0).key).toEqual('queryparam1');
    expect(resultedUrl.query.at(0).value).toEqual('q1');
    expect(resultedUrl.variable.at(0).key).toEqual('variableOne');
    expect(resultedUrl.variable.at(0).value).toEqual('v1');
    expect(resultedUrl.variable.at(1).key).toEqual('variableTwo');
    expect(resultedUrl.variable.at(1).value).toEqual('v2');
  });

  it('should handle full http url with variables', () => {
    const brunoObj = {
      items: [
        {
          request: {
            url: 'http://{{hostname}}/path1/path2/:variableOne/path3/:variableTwo?queryparam1=test',
            method: 'GET',
            headers: [],
            params: [
              {
                name: 'queryparam1',
                value: 'q1',
                type: 'query',
                enabled: true
              },
              {
                name: 'variableOne',
                value: 'v1',
                type: 'path',
                enabled: true
              },
              {
                name: 'variableTwo',
                value: 'v2',
                type: 'path',
                enabled: true
              }
            ],
            body: {
              mode: 'none',
              formUrlEncoded: [],
              multipartForm: []
            }
          }
        }
      ]
    }
    const resultedUrl = convertCollection(brunoObj).item.at(0).request.url;

    expect(resultedUrl.raw).toEqual('http://{{hostname}}/path1/path2/:variableOne/path3/:variableTwo?queryparam1=test');
    expect(resultedUrl.protocol).toEqual('http');
    expect(resultedUrl.auth).toEqual(null);
    expect(resultedUrl.host).toEqual(['{{hostname}}']);
    expect(resultedUrl.path).toEqual(['path1', 'path2', ':variableOne', 'path3', ':variableTwo']);
    expect(resultedUrl.query.at(0).key).toEqual('queryparam1');
    expect(resultedUrl.query.at(0).value).toEqual('q1');
    expect(resultedUrl.variable.at(0).key).toEqual('variableOne');
    expect(resultedUrl.variable.at(0).value).toEqual('v1');
    expect(resultedUrl.variable.at(1).key).toEqual('variableTwo');
    expect(resultedUrl.variable.at(1).value).toEqual('v2');
  });

  it('should handle urls with no protocol', () => {
    const brunoObj = {
      items: [
        {
          request: {
            url: '{{hostname}}/path1/path2/:variableOne/path3/:variableTwo?queryparam1=test',
            method: 'GET',
            headers: [],
            params: [
              {
                name: 'queryparam1',
                value: 'q1',
                type: 'query',
                enabled: true
              },
              {
                name: 'variableOne',
                value: 'v1',
                type: 'path',
                enabled: true
              },
              {
                name: 'variableTwo',
                value: 'v2',
                type: 'path',
                enabled: true
              }
            ],
            body: {
              mode: 'none',
              formUrlEncoded: [],
              multipartForm: []
            }
          }
        }
      ]
    }
    const resultedUrl = convertCollection(brunoObj).item.at(0).request.url;

    expect(resultedUrl.raw).toEqual('{{hostname}}/path1/path2/:variableOne/path3/:variableTwo?queryparam1=test');
    expect(resultedUrl.protocol).toEqual(null);
    expect(resultedUrl.auth).toEqual(null);
    expect(resultedUrl.host).toEqual(['{{hostname}}']);
    expect(resultedUrl.path).toEqual(['path1', 'path2', ':variableOne', 'path3', ':variableTwo']);
    expect(resultedUrl.query.at(0).key).toEqual('queryparam1');
    expect(resultedUrl.query.at(0).value).toEqual('q1');
    expect(resultedUrl.variable.at(0).key).toEqual('variableOne');
    expect(resultedUrl.variable.at(0).value).toEqual('v1');
    expect(resultedUrl.variable.at(1).key).toEqual('variableTwo');
    expect(resultedUrl.variable.at(1).value).toEqual('v2');
  });

  it('should handle a normal host', () => {
    const brunoObj = {
      items: [
        {
          request: {
            url: 'test.com/path1/path2/:variableOne/path3/:variableTwo?queryparam1=test',
            method: 'GET',
            headers: [],
            params: [
              {
                name: 'queryparam1',
                value: 'q1',
                type: 'query',
                enabled: true
              },
              {
                name: 'variableOne',
                value: 'v1',
                type: 'path',
                enabled: true
              },
              {
                name: 'variableTwo',
                value: 'v2',
                type: 'path',
                enabled: true
              }
            ],
            body: {
              mode: 'none',
              formUrlEncoded: [],
              multipartForm: []
            }
          }
        }
      ]
    }
    const resultedUrl = convertCollection(brunoObj).item.at(0).request.url;

    expect(resultedUrl.raw).toEqual('test.com/path1/path2/:variableOne/path3/:variableTwo?queryparam1=test');
    expect(resultedUrl.protocol).toEqual(null);
    expect(resultedUrl.auth).toEqual(null);
    expect(resultedUrl.host).toEqual(['test', 'com']);
    expect(resultedUrl.path).toEqual(['path1', 'path2', ':variableOne', 'path3', ':variableTwo']);
    expect(resultedUrl.query.at(0).key).toEqual('queryparam1');
    expect(resultedUrl.query.at(0).value).toEqual('q1');
    expect(resultedUrl.variable.at(0).key).toEqual('variableOne');
    expect(resultedUrl.variable.at(0).value).toEqual('v1');
    expect(resultedUrl.variable.at(1).key).toEqual('variableTwo');
    expect(resultedUrl.variable.at(1).value).toEqual('v2');
  });

  it('should handle no host at all', () => {
    const brunoObj = {
      items: [
        {
          request: {
            url: '/path1/path2/:variableOne/path3/:variableTwo?queryparam1=test',
            method: 'GET',
            headers: [],
            params: [
              {
                name: 'queryparam1',
                value: 'q1',
                type: 'query',
                enabled: true
              },
              {
                name: 'variableOne',
                value: 'v1',
                type: 'path',
                enabled: true
              },
              {
                name: 'variableTwo',
                value: 'v2',
                type: 'path',
                enabled: true
              }
            ],
            body: {
              mode: 'none',
              formUrlEncoded: [],
              multipartForm: []
            }
          }
        }
      ]
    }
    const resultedUrl = convertCollection(brunoObj).item.at(0).request.url;

    expect(resultedUrl.raw).toEqual('/path1/path2/:variableOne/path3/:variableTwo?queryparam1=test');
    expect(resultedUrl.protocol).toEqual(null);
    expect(resultedUrl.auth).toEqual(null);
    expect(resultedUrl.host).toEqual(null);
    expect(resultedUrl.path).toEqual(['path1', 'path2', ':variableOne', 'path3', ':variableTwo']);
    expect(resultedUrl.query.at(0).key).toEqual('queryparam1');
    expect(resultedUrl.query.at(0).value).toEqual('q1');
    expect(resultedUrl.variable.at(0).key).toEqual('variableOne');
    expect(resultedUrl.variable.at(0).value).toEqual('v1');
    expect(resultedUrl.variable.at(1).key).toEqual('variableTwo');
    expect(resultedUrl.variable.at(1).value).toEqual('v2');
  });

  it('should handle a host with no dot', () => {
    const brunoObj = {
      items: [
        {
          request: {
            url: 'test/path1/:variableOne/path3/:variableTwo?queryparam1=test',
            method: 'GET',
            headers: [],
            params: [
              {
                name: 'queryparam1',
                value: 'q1',
                type: 'query',
                enabled: true
              },
              {
                name: 'variableOne',
                value: 'v1',
                type: 'path',
                enabled: true
              },
              {
                name: 'variableTwo',
                value: 'v2',
                type: 'path',
                enabled: true
              }
            ],
            body: {
              mode: 'none',
              formUrlEncoded: [],
              multipartForm: []
            }
          }
        }
      ]
    }
    const resultedUrl = convertCollection(brunoObj).item.at(0).request.url;

    expect(resultedUrl.raw).toEqual('test/path1/:variableOne/path3/:variableTwo?queryparam1=test');
    expect(resultedUrl.protocol).toEqual(null);
    expect(resultedUrl.auth).toEqual(null);
    expect(resultedUrl.host).toEqual(['test']);
    expect(resultedUrl.path).toEqual(['path1', ':variableOne', 'path3', ':variableTwo']);
    expect(resultedUrl.query.at(0).key).toEqual('queryparam1');
    expect(resultedUrl.query.at(0).value).toEqual('q1');
    expect(resultedUrl.variable.at(0).key).toEqual('variableOne');
    expect(resultedUrl.variable.at(0).value).toEqual('v1');
    expect(resultedUrl.variable.at(1).key).toEqual('variableTwo');
    expect(resultedUrl.variable.at(1).value).toEqual('v2');
  });

  it('should handle proxy like format', () => {
    const brunoObj = {
      items: [
        {
          request: {
            url: 'http://test1:test2@test.com/path1/path2/:variableOne/path3/:variableTwo?queryparam1=test',
            method: 'GET',
            headers: [],
            params: [
              {
                name: 'queryparam1',
                value: 'q1',
                type: 'query',
                enabled: true
              },
              {
                name: 'variableOne',
                value: 'v1',
                type: 'path',
                enabled: true
              },
              {
                name: 'variableTwo',
                value: 'v2',
                type: 'path',
                enabled: true
              }
            ],
            body: {
              mode: 'none',
              formUrlEncoded: [],
              multipartForm: []
            }
          }
        }
      ]
    }
    const resultedUrl = convertCollection(brunoObj).item.at(0).request.url;

    expect(resultedUrl.raw).toEqual('http://test1:test2@test.com/path1/path2/:variableOne/path3/:variableTwo?queryparam1=test');
    expect(resultedUrl.protocol).toEqual('http');
    expect(resultedUrl.auth.user).toEqual('test1');
    expect(resultedUrl.auth.password).toEqual('test2');
    expect(resultedUrl.host).toEqual(['test', 'com']);
    expect(resultedUrl.path).toEqual(['path1', 'path2', ':variableOne', 'path3', ':variableTwo']);
    expect(resultedUrl.query.at(0).key).toEqual('queryparam1');
    expect(resultedUrl.query.at(0).value).toEqual('q1');
    expect(resultedUrl.variable.at(0).key).toEqual('variableOne');
    expect(resultedUrl.variable.at(0).value).toEqual('v1');
    expect(resultedUrl.variable.at(1).key).toEqual('variableTwo');
    expect(resultedUrl.variable.at(1).value).toEqual('v2');
  });

  it('should handle urls with hashtags', () => {
    const brunoObj = {
      items: [
        {
          request: {
            url: 'https://{{hostname}}/path1/path2/:variableOne/path3/:variableTwo?queryparam1=test#hashtag1',
            method: 'GET',
            headers: [],
            params: [
              {
                name: 'queryparam1',
                value: 'q1',
                type: 'query',
                enabled: true
              },
              {
                name: 'variableOne',
                value: 'v1',
                type: 'path',
                enabled: true
              },
              {
                name: 'variableTwo',
                value: 'v2',
                type: 'path',
                enabled: true
              }
            ],
            body: {
              mode: 'none',
              formUrlEncoded: [],
              multipartForm: []
            }
          }
        }
      ]
    }
    const resultedUrl = convertCollection(brunoObj).item.at(0).request.url;

    expect(resultedUrl.raw).toEqual('https://{{hostname}}/path1/path2/:variableOne/path3/:variableTwo?queryparam1=test#hashtag1');
    expect(resultedUrl.protocol).toEqual('https');
    expect(resultedUrl.auth).toEqual(null);
    expect(resultedUrl.host).toEqual(['{{hostname}}']);
    expect(resultedUrl.path).toEqual(['path1', 'path2', ':variableOne', 'path3', ':variableTwo']);
    expect(resultedUrl.query.at(0).key).toEqual('queryparam1');
    expect(resultedUrl.query.at(0).value).toEqual('q1');
    expect(resultedUrl.variable.at(0).key).toEqual('variableOne');
    expect(resultedUrl.variable.at(0).value).toEqual('v1');
    expect(resultedUrl.variable.at(1).key).toEqual('variableTwo');
    expect(resultedUrl.variable.at(1).value).toEqual('v2');
  });
});