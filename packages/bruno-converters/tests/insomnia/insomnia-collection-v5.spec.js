import { describe, it, expect } from '@jest/globals';
import insomniaToBruno from '../../src/insomnia/insomnia-to-bruno';

describe('insomnia-collection', () => {
  it('should correctly import a valid Insomnia v5 collection file', async () => {
    const brunoCollection = insomniaToBruno(insomniaCollection);

    expect(brunoCollection).toMatchObject(expectedOutput)
  });
});

const insomniaCollection = `
type: collection.insomnia.rest/5.0
name: Hello World Workspace Insomnia
meta:
  id: wrk_9381cf78cb0a4eaaab1d571f29f928dc
  created: 1744194421962
  modified: 1744194421962
collection:
  - name: Folder1
    meta:
      id: fld_6beacec0bd2f4370be98169217e82a2c
      created: 1744194421968
      modified: 1744194421968
      sortKey: -1744194421968
    children:
      - url: https://httpbin.org/get
        name: Request1
        meta:
          id: req_e9fbdc9c88984068a04f442e052d4ff1
          created: 1744194421965
          modified: 1744194421965
          isPrivate: false
          sortKey: -1744194421965
        method: GET
        settings:
          renderRequestBody: true
          encodeUrl: true
          followRedirects: global
          cookies:
            send: true
            store: true
          rebuildPath: true
  - name: Folder2
    meta:
      id: fld_96508d79bf06420a853b07482ab280d7
      created: 1744194421969
      modified: 1744194421969
      sortKey: -1744194421969
    children:
      - url: https://httpbin.org/get
        name: Request2
        meta:
          id: req_3c572aa26a964f1f800bfa5c53cacb75
          created: 1744194421967
          modified: 1744194421967
          isPrivate: false
          sortKey: -1744194421968
        method: GET
        settings:
          renderRequestBody: true
          encodeUrl: false
          followRedirects: global
          cookies:
            send: true
            store: true
          rebuildPath: true
cookieJar:
  name: Default Jar
  meta:
    id: jar_9ecb97079037c7d5bb888f0bfdec9b0e1275c6d1
    created: 1744194421971
    modified: 1744194421971
environments:
  name: Imported Environment
  meta:
    id: env_a8a9a8ff952d4d079edf53f8ee22a423
    created: 1744194421970
    modified: 1744194421970
    isPrivate: false
  data:
    var1: value1
    var2: value2
`

const expectedOutput = {
  "environments": [],
  "items": [
    {
      "items": [
        {
          "name": "Request1",
          "request": {
            "auth": {
              "basic": null,
              "bearer": null,
              "digest": null,
              "mode": "none",
            },
            "body": {
              "formUrlEncoded": [],
              "json": null,
              "mode": "none",
              "multipartForm": [],
              "text": null,
              "xml": null,
            },
            "headers": [],
            "method": "GET",
            "params": [],
            "url": "https://httpbin.org/get",
          },
          "seq": 1,
          "type": "http-request",
          "uid": "mockeduuidvalue123456",
          "settings": {
            "encodeUrl": true,
          },
        },
      ],
      "name": "Folder1",
      "type": "folder",
      "uid": "mockeduuidvalue123456",
    },
    {
      "items": [
        {
          "name": "Request2",
          "request": {
            "auth": {
              "basic": null,
              "bearer": null,
              "digest": null,
              "mode": "none",
            },
            "body": {
              "formUrlEncoded": [],
              "json": null,
              "mode": "none",
              "multipartForm": [],
              "text": null,
              "xml": null,
            },
            "headers": [],
            "method": "GET",
            "params": [],
            "url": "https://httpbin.org/get",
          },
          "seq": 1,
          "type": "http-request",
          "uid": "mockeduuidvalue123456",
          "settings": {
            "encodeUrl": false,
          },
        },
      ],
      "name": "Folder2",
      "type": "folder",
      "uid": "mockeduuidvalue123456",
    },
  ],
  "name": "Hello World Workspace Insomnia",
  "uid": "mockeduuidvalue123456",
  "version": "1",
};