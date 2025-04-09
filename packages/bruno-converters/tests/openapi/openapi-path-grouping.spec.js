import jsyaml from 'js-yaml';
import { describe, it, expect } from '@jest/globals';
import openApiToBruno from '../../src/openapi/openapi-to-bruno';

describe('openapi-path-based-grouping', () => {
  it('should correctly group endpoints by path segments', async () => {
    const openApiSpecification = jsyaml.load(openApiWithNestedPaths);
    const brunoCollection = openApiToBruno(openApiSpecification);

    expect(brunoCollection).toMatchObject(expectedNestedPathsOutput);
  });
});

const openApiWithNestedPaths = `
openapi: "3.0.0"
info:
  version: "1.0.0"
  title: "Path Grouping Test API"
paths:
  /api/users:
    get:
      summary: "List Users"
      responses:
        '200':
          description: "Successful response"
    post:
      summary: "Create User"
      responses:
        '201':
          description: "User created"
  /api/users/{userId}:
    get:
      summary: "Get User"
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: "User found"
  /api/users/{userId}/posts:
    get:
      summary: "List User Posts"
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: "Posts found"
servers:
  - url: "https://api.example.com"
`;

const expectedNestedPathsOutput = {
  "name": "Path Grouping Test API",
  "uid": "mockeduuidvalue123456",
  "version": "1",
  "environments": [
    {
      "name": "Environment 1",
      "uid": "mockeduuidvalue123456",
      "variables": [
        {
          "enabled": true,
          "name": "baseUrl",
          "secret": false,
          "type": "text",
          "uid": "mockeduuidvalue123456",
          "value": "https://api.example.com"
        }
      ]
    }
  ],
  "items": [
    {
      "name": "api",
      "type": "folder",
      "uid": "mockeduuidvalue123456",
      "items": [
        {
          "name": "users",
          "type": "folder",
          "uid": "mockeduuidvalue123456",
          "items": [
            {
              "name": "List Users",
              "type": "http-request",
              "uid": "mockeduuidvalue123456",
              "request": {
                "auth": {
                  "basic": null,
                  "bearer": null,
                  "digest": null,
                  "mode": "none"
                },
                "body": {
                  "formUrlEncoded": [],
                  "json": null,
                  "mode": "none",
                  "multipartForm": [],
                  "text": null,
                  "xml": null
                },
                "headers": [],
                "method": "GET",
                "params": [],
                "script": {
                  "res": null
                },
                "url": "{{baseUrl}}/api/users"
              },
              "seq": 1
            },
            {
              "name": "Create User",
              "type": "http-request",
              "uid": "mockeduuidvalue123456",
              "request": {
                "auth": {
                  "mode": "none",
                  "basic": null,
                  "bearer": null,
                  "digest": null
                },
                "body": {
                  "mode": "none",
                  "json": null,
                  "text": null,
                  "xml": null,
                  "formUrlEncoded": [],
                  "multipartForm": []
                },
                "headers": [],
                "method": "POST",
                "params": [],
                "script": {
                  "res": null
                },
                "url": "{{baseUrl}}/api/users"
              },
              "seq": 2
            },
            {
              "name": "{userId}",
              "type": "folder",
              "uid": "mockeduuidvalue123456",
              "items": [
                {
                  "name": "Get User",
                  "type": "http-request",
                  "uid": "mockeduuidvalue123456",
                  "request": {
                    "auth": {
                      "mode": "none",
                      "basic": null,
                      "bearer": null,
                      "digest": null
                    },
                    "body": {
                      "mode": "none",
                      "json": null,
                      "text": null,
                      "xml": null,
                      "formUrlEncoded": [],
                      "multipartForm": []
                    },
                    "headers": [],
                    "method": "GET",
                    "params": [
                      {
                        "name": "userId",
                        "value": "",
                        "description": "",
                        "enabled": true,
                        "type": "path",
                        "uid": "mockeduuidvalue123456"
                      }
                    ],
                    "script": {
                      "res": null
                    },
                    "url": "{{baseUrl}}/api/users/:userId"
                  },
                  "seq": 1
                },
                {
                  "name": "posts",
                  "type": "folder",
                  "uid": "mockeduuidvalue123456",
                  "items": [
                    {
                      "name": "List User Posts",
                      "type": "http-request",
                      "uid": "mockeduuidvalue123456",
                      "request": {
                        "auth": {
                          "mode": "none",
                          "basic": null,
                          "bearer": null,
                          "digest": null
                        },
                        "body": {
                          "mode": "none",
                          "json": null,
                          "text": null,
                          "xml": null,
                          "formUrlEncoded": [],
                          "multipartForm": []
                        },
                        "headers": [],
                        "method": "GET",
                        "params": [
                          {
                            "name": "userId",
                            "value": "",
                            "description": "",
                            "enabled": true,
                            "type": "path",
                            "uid": "mockeduuidvalue123456"
                          }
                        ],
                        "script": {
                          "res": null
                        },
                        "url": "{{baseUrl}}/api/users/:userId/posts"
                      },
                      "seq": 1
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};