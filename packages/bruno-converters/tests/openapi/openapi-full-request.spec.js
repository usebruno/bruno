import jsyaml from 'js-yaml';
import { describe, it, expect } from '@jest/globals';
import openApiToBruno from '../../src/openapi/openapi-to-bruno';

describe('openapi-full-request-conversion', () => {
  it('should correctly convert OpenAPI spec with auth, body, headers', async () => {
    const openApiSpecification = jsyaml.load(openApiSpec);
    const brunoCollection = openApiToBruno(openApiSpecification);

    expect(brunoCollection).toMatchObject(expectedOutput);
  });
});

const openApiSpec = `
openapi: "3.0.0"
info:
  version: "1.0.0"
  title: "Test API Spec"
servers:
  - url: "https://api.example.com/v1"
    description: "Production server"
  - url: "https://staging-api.example.com/v1"
    description: "Staging server"
security:
  - bearerAuth: []
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        email:
          type: string
paths:
  /users:
    post:
      summary: "Create User"
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/User'
      parameters:
        - in: header
          name: "x-api-version"
          required: true
          schema:
            type: string
        - in: header
          name: "x-correlation-id"
          required: false
          schema:
            type: string
      responses:
        '201':
          description: "User created successfully"
    get:
      summary: "List Users"
      security:
        - bearerAuth: []
      parameters:
        - in: query
          name: "page"
          required: false
          schema:
            type: integer
            default: 1
        - in: query
          name: "limit"
          required: false
          schema:
            type: integer
            default: 10
        - in: header
          name: "x-api-version"
          required: true
          schema:
            type: string
      responses:
        '200':
          description: "List of users"
  /users/{userId}/profile:
    put:
      summary: "Update User Profile"
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: "userId"
          required: true
          schema:
            type: string
        - in: header
          name: "Content-Type"
          required: true
          schema:
            type: string
            default: "multipart/form-data"
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                avatar:
                  type: string
                  format: binary
                bio:
                  type: string
      responses:
        '200':
          description: "Profile updated successfully"
`;

const expectedOutput = {
  "name": "Test API Spec",
  "uid": "mockeduuidvalue123456",
  "version": "1",
  "environments": [
    {
      "name": "Production server",
      "uid": "mockeduuidvalue123456",
      "variables": [
        {
          "enabled": true,
          "name": "baseUrl",
          "secret": false,
          "type": "text",
          "uid": "mockeduuidvalue123456",
          "value": "https://api.example.com/v1"
        }
      ]
    },
    {
      "name": "Staging server",
      "uid": "mockeduuidvalue123456",
      "variables": [
        {
          "enabled": true,
          "name": "baseUrl",
          "secret": false,
          "type": "text",
          "uid": "mockeduuidvalue123456",
          "value": "https://staging-api.example.com/v1"
        }
      ]
    }
  ],
  "items": [
    {
      "name": "users",
      "type": "folder",
      "uid": "mockeduuidvalue123456",
      "items": [
        {
          "name": "Create User",
          "type": "http-request",
          "uid": "mockeduuidvalue123456",
          "request": {
            "auth": {
              "mode": "bearer",
              "basic": null,
              "bearer": {
                "token": "{{token}}"
              },
              "digest": null
            },
            "body": {
              "mode": "json",
              "json": "{\n  \"id\": \"\",\n  \"name\": \"\",\n  \"email\": \"\"\n}",
              "text": null,
              "xml": null,
              "formUrlEncoded": [],
              "multipartForm": []
            },
            "headers": [
              {
                "uid": "mockeduuidvalue123456",
                "name": "x-api-version",
                "value": "",
                "description": "",
                "enabled": true
              },
              {
                "uid": "mockeduuidvalue123456",
                "name": "x-correlation-id",
                "value": "",
                "description": "",
                "enabled": false
              }
            ],
            "method": "POST",
            "params": [],
            "script": {
              "res": null
            },
            "url": "{{baseUrl}}/users"
          },
          "seq": 1
        },
        {
          "name": "List Users",
          "type": "http-request",
          "uid": "mockeduuidvalue123456",
          "request": {
            "auth": {
              "mode": "bearer",
              "basic": null,
              "bearer": {
                "token": "{{token}}"
              },
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
            "headers": [
              {
                "uid": "mockeduuidvalue123456",
                "name": "x-api-version",
                "value": "",
                "description": "",
                "enabled": true
              }
            ],
            "method": "GET",
            "params": [
              {
                "uid": "mockeduuidvalue123456",
                "name": "page",
                "value": "1",
                "description": "",
                "enabled": false
              },
              {
                "uid": "mockeduuidvalue123456",
                "name": "limit",
                "value": "10",
                "description": "",
                "enabled": false
              }
            ],
            "script": {
              "res": null
            },
            "url": "{{baseUrl}}/users"
          },
          "seq": 2
        },
        {
          "name": "{userId}",
          "type": "folder",
          "uid": "mockeduuidvalue123456",
          "items": [
            {
              "name": "profile",
              "type": "folder",
              "uid": "mockeduuidvalue123456",
              "items": [
                {
                  "name": "Update User Profile",
                  "type": "http-request",
                  "uid": "mockeduuidvalue123456",
                  "request": {
                    "auth": {
                      "mode": "bearer",
                      "basic": null,
                      "bearer": {
                        "token": "{{token}}"
                      },
                      "digest": null
                    },
                    "body": {
                      "mode": "multipartForm",
                      "json": null,
                      "text": null,
                      "xml": null,
                      "formUrlEncoded": [],
                      "multipartForm": [
                        {
                          "uid": "mockeduuidvalue123456",
                          "name": "avatar",
                          "value": "",
                          "description": "",
                          "enabled": true,
                          "type": "text"
                        },
                        {
                          "uid": "mockeduuidvalue123456",
                          "name": "bio",
                          "value": "",
                          "description": "",
                          "enabled": true,
                          "type": "text"
                        }
                      ]
                    },
                    "headers": [
                      {
                        "uid": "mockeduuidvalue123456",
                        "name": "Content-Type",
                        "value": "multipart/form-data",
                        "description": "",
                        "enabled": true
                      }
                    ],
                    "method": "PUT",
                    "params": [
                      {
                        "uid": "mockeduuidvalue123456",
                        "name": "userId",
                        "value": "",
                        "description": "",
                        "enabled": true,
                        "type": "path"
                      }
                    ],
                    "script": {
                      "res": null
                    },
                    "url": "{{baseUrl}}/users/:userId/profile"
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
}; 