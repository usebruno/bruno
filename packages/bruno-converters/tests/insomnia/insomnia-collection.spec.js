import { describe, it, expect } from '@jest/globals';
import insomniaToBruno from '../../src/insomnia/insomnia-to-bruno';

describe('insomnia-collection', () => {
  it('should correctly import a valid Insomnia collection file', async () => {
    const brunoCollection = insomniaToBruno(insomniaCollection);

    expect(brunoCollection).toMatchObject(expectedOutput);
  });

  it('should import empty mimeType bodies as Bruno text bodies', async () => {
    const brunoCollection = insomniaToBruno(insomniaCollectionWithEmptyMimeTypeBody);

    expect(brunoCollection.items[0].request.body).toMatchObject({
      mode: 'text',
      text: 'line1\nline2\n{{base_url}}',
      json: null,
      xml: null
    });
  });

  it('should ignore empty raw bodies when mimeType is blank', async () => {
    const brunoCollection = insomniaToBruno(insomniaCollectionWithEmptyMimeTypeAndEmptyTextBody);

    expect(brunoCollection.items[0].request.body).toMatchObject({
      mode: 'none',
      text: null,
      json: null,
      xml: null
    });
  });
});

const insomniaCollection = {
  _type: 'export',
  __export_format: 4,
  __export_date: '2024-05-20T10:02:44.123Z',
  __export_source: 'insomnia.desktop.app:v2021.5.2',
  resources: [
    {
      _id: 'req_1',
      _type: 'request',
      parentId: 'fld_1',
      name: 'Request1',
      method: 'GET',
      url: 'https://testbench-sanity.usebruno.com/ping',
      settingEncodeUrl: false,
      parameters: []
    },
    {
      _id: 'req_2',
      _type: 'request',
      parentId: 'fld_2',
      name: 'Request2',
      method: 'GET',
      url: 'https://testbench-sanity.usebruno.com/ping',
      settingEncodeUrl: true,
      parameters: []
    },
    {
      _id: 'fld_1',
      _type: 'request_group',
      parentId: 'wrk_1',
      name: 'Folder1'
    },
    {
      _id: 'fld_2',
      _type: 'request_group',
      parentId: 'wrk_1',
      name: 'Folder2'
    },
    {
      _id: 'wrk_1',
      _type: 'workspace',
      name: 'Hello World Workspace Insomnia'
    },
    {
      _id: 'env_1',
      _type: 'environment',
      parentId: 'wrk_1',
      data: {
        var1: 'value1',
        var2: 'value2'
      }
    }
  ]
};

const expectedOutput = {
  environments: [
    {
      name: 'Environment 1',
      variables: [
        {
          name: 'var1',
          value: 'value1',
          type: 'text',
          enabled: true,
          secret: false
        },
        {
          name: 'var2',
          value: 'value2',
          type: 'text',
          enabled: true,
          secret: false
        }
      ]
    }
  ],
  items: [
    {
      items: [
        {
          name: 'Request1',
          request: {
            auth: {
              basic: null,
              bearer: null,
              digest: null,
              mode: 'none'
            },
            body: {
              formUrlEncoded: [],
              json: null,
              mode: 'none',
              multipartForm: [],
              text: null,
              xml: null
            },
            headers: [],
            method: 'GET',
            params: [],
            url: 'https://testbench-sanity.usebruno.com/ping'
          },
          seq: 1,
          type: 'http-request',
          uid: 'mockeduuidvalue123456',
          settings: {
            encodeUrl: false
          }
        },
        {
          name: 'Request1',
          request: {
            auth: {
              basic: null,
              bearer: null,
              digest: null,
              mode: 'none'
            },
            body: {
              formUrlEncoded: [],
              json: null,
              mode: 'none',
              multipartForm: [],
              text: null,
              xml: null
            },
            headers: [],
            method: 'GET',
            params: [],
            url: 'https://testbench-sanity.usebruno.com/ping'
          },
          seq: 2,
          type: 'http-request',
          uid: 'mockeduuidvalue123456',
          settings: {
            encodeUrl: false
          }
        }
      ],
      name: 'Folder1',
      type: 'folder',
      uid: 'mockeduuidvalue123456'
    },
    {
      items: [
        {
          name: 'Request2',
          request: {
            auth: {
              basic: null,
              bearer: null,
              digest: null,
              mode: 'none'
            },
            body: {
              formUrlEncoded: [],
              json: null,
              mode: 'none',
              multipartForm: [],
              text: null,
              xml: null
            },
            headers: [],
            method: 'GET',
            params: [],
            url: 'https://testbench-sanity.usebruno.com/ping'
          },
          seq: 1,
          type: 'http-request',
          uid: 'mockeduuidvalue123456',
          settings: {
            encodeUrl: true
          }
        },
        {
          name: 'Request2',
          request: {
            auth: {
              basic: null,
              bearer: null,
              digest: null,
              mode: 'none'
            },
            body: {
              formUrlEncoded: [],
              json: null,
              mode: 'none',
              multipartForm: [],
              text: null,
              xml: null
            },
            headers: [],
            method: 'GET',
            params: [],
            url: 'https://testbench-sanity.usebruno.com/ping'
          },
          seq: 2,
          type: 'http-request',
          uid: 'mockeduuidvalue123456',
          settings: {
            encodeUrl: true
          }
        }
      ],
      name: 'Folder2',
      type: 'folder',
      uid: 'mockeduuidvalue123456'
    }
  ],
  name: 'Hello World Workspace Insomnia',
  uid: 'mockeduuidvalue123456',
  version: '1'
};

const insomniaCollectionWithEmptyMimeTypeBody = {
  _type: 'export',
  __export_format: 4,
  resources: [
    {
      _id: 'req_text_1',
      _type: 'request',
      parentId: 'wrk_text_1',
      name: 'Raw Text Body',
      method: 'POST',
      url: 'https://example.com/raw',
      parameters: [],
      body: {
        mimeType: '',
        text: 'line1\nline2\n{{ base_url }}'
      }
    },
    {
      _id: 'wrk_text_1',
      _type: 'workspace',
      name: 'Text Body Workspace'
    }
  ]
};

const insomniaCollectionWithEmptyMimeTypeAndEmptyTextBody = {
  _type: 'export',
  __export_format: 4,
  resources: [
    {
      _id: 'req_text_2',
      _type: 'request',
      parentId: 'wrk_text_2',
      name: 'Empty Raw Text Body',
      method: 'POST',
      url: 'https://example.com/raw-empty',
      parameters: [],
      body: {
        mimeType: '',
        text: ''
      }
    },
    {
      _id: 'wrk_text_2',
      _type: 'workspace',
      name: 'Empty Text Body Workspace'
    }
  ]
};
