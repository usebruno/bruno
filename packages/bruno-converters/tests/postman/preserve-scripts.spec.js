import { describe, it, expect } from '@jest/globals';
import postmanToBruno from '../../src/postman/postman-to-bruno';
import { brunoToPostman } from '../../src/postman/bruno-to-postman';

const postmanCollectionWithScripts = {
  info: {
    _postman_id: 'preserve-scripts-test',
    name: 'Preserve Scripts Collection',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  variable: [{ key: 'token', value: 'abc123' }],
  item: [
    {
      name: 'Get User',
      request: { method: 'GET', url: 'https://example.com/users' },
      event: [
        {
          listen: 'prerequest',
          script: { type: 'text/javascript', exec: ['pm.environment.set(\'token\', \'123\')', 'console.log(\'pre\')'] }
        },
        {
          listen: 'test',
          script: { type: 'text/javascript', exec: ['pm.test(\'status is 200\', function () {', '  pm.response.to.have.status(200);', '});'] }
        }
      ]
    }
  ]
};

describe('preserve scripts option is enabled when importing a Postman collection', () => {
  it('should keep pre-request and test scripts as-is instead of translating pm.* to bru.*', async () => {
    const { collection } = await postmanToBruno(postmanCollectionWithScripts, { preserveScripts: true });
    const request = collection.items[0].request;

    // scripts are preserved exactly as in the imported postman collection
    expect(request.script.req).toBe('pm.environment.set(\'token\', \'123\')\nconsole.log(\'pre\')');
    expect(request.script.res).toBe('pm.test(\'status is 200\', function () {\n  pm.response.to.have.status(200);\n});');

    // no pm.* -> bru.* translation occurred
    expect(request.script.req).not.toContain('bru.');
    expect(request.script.res).not.toContain('bru.');
  });

  it('should convert the collection metadata, requests, and variables', async () => {
    const { collection } = await postmanToBruno(postmanCollectionWithScripts, { preserveScripts: true });

    expect(collection.name).toBe('Preserve Scripts Collection');
    expect(collection.items).toHaveLength(1);
    expect(collection.items[0].name).toBe('Get User');
    expect(collection.items[0].request.method).toBe('GET');
    expect(collection.items[0].request.url).toBe('https://example.com/users');
    expect(collection.root.request.vars.req).toMatchObject([{ name: 'token', value: 'abc123', enabled: true }]);
  });

  it('should translate scripts to bru.* by default when the option is not enabled', async () => {
    const { collection } = await postmanToBruno(postmanCollectionWithScripts);
    const request = collection.items[0].request;

    expect(request.script.req).toContain('bru.setEnvVar(\'token\', \'123\')');
    expect(request.script.req).not.toContain('pm.environment.set');
  });

  it('should keep scripts as is even when the worker path is used', async () => {
    const { collection } = await postmanToBruno(postmanCollectionWithScripts, {
      useWorkers: true,
      preserveScripts: true
    });
    const request = collection.items[0].request;

    expect(request.script.req).toBe('pm.environment.set(\'token\', \'123\')\nconsole.log(\'pre\')');
    expect(request.script.res).toBe('pm.test(\'status is 200\', function () {\n  pm.response.to.have.status(200);\n});');
    expect(request.script.req).not.toContain('bru.');
  });

  it('should leave pm.require() and require() calls untouched', async () => {
    const collectionWithRequire = {
      info: {
        _postman_id: 'preserve-require-test',
        name: 'Require Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'Uses packages',
          request: { method: 'GET', url: 'https://example.com' },
          event: [
            {
              listen: 'prerequest',
              script: { type: 'text/javascript', exec: ['const _ = pm.require(\'lodash\');', 'const axios = require(\'axios\');'] }
            }
          ]
        }
      ]
    };

    const { collection } = await postmanToBruno(collectionWithRequire, { preserveScripts: true });
    const request = collection.items[0].request;

    // require rewriting is skipped in preserve mode
    expect(request.script.req).toBe('const _ = pm.require(\'lodash\');\nconst axios = require(\'axios\');');
  });
});

describe('preserve scripts for collection and folder level scripts', () => {
  const postmanCollectionWithNestedScripts = {
    info: {
      _postman_id: 'preserve-nested-test',
      name: 'Nested Scripts Collection',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    event: [
      { listen: 'prerequest', script: { type: 'text/javascript', exec: ['pm.environment.set(\'collectionVar\', \'1\')'] } },
      { listen: 'test', script: { type: 'text/javascript', exec: ['pm.test(\'collection-level test\', function () {});'] } }
    ],
    item: [
      {
        name: 'Auth Folder',
        event: [
          { listen: 'prerequest', script: { type: 'text/javascript', exec: ['pm.variables.set(\'folderVar\', \'2\')'] } },
          { listen: 'test', script: { type: 'text/javascript', exec: ['pm.expect(true).to.be.true;'] } }
        ],
        item: [{ name: 'Login', request: { method: 'POST', url: 'https://example.com/login' } }]
      }
    ]
  };

  it('should keep collection level scripts as is', async () => {
    const { collection } = await postmanToBruno(postmanCollectionWithNestedScripts, { preserveScripts: true });
    const rootScript = collection.root.request.script;

    expect(rootScript.req).toBe('pm.environment.set(\'collectionVar\', \'1\')');
    expect(rootScript.res).toBe('pm.test(\'collection-level test\', function () {});');
    expect(rootScript.req).not.toContain('bru.');
  });

  it('should keep folder level scripts as is', async () => {
    const { collection } = await postmanToBruno(postmanCollectionWithNestedScripts, { preserveScripts: true });
    const folder = collection.items.find((i) => i.type === 'folder');
    const folderScript = folder.root.request.script;

    expect(folderScript.req).toBe('pm.variables.set(\'folderVar\', \'2\')');
    expect(folderScript.res).toBe('pm.expect(true).to.be.true;');
    expect(folderScript.req).not.toContain('bru.');
  });
});

describe('Preserve scripts option when exporting a collection to Postman', () => {
  const brunoCollectionWithScripts = {
    name: 'Bruno Collection',
    items: [
      {
        name: 'Get User',
        type: 'http-request',
        request: {
          method: 'GET',
          url: 'https://example.com/users',
          script: {
            req: 'bru.setEnvVar(\'token\', \'123\')',
            res: 'test(\'status is 200\', function () {\n  expect(res.getStatus()).to.equal(200);\n});'
          }
        }
      }
    ]
  };

  it('should keep scripts as is instead of translating bru.* to pm.*', () => {
    const result = brunoToPostman(brunoCollectionWithScripts, { preserveScripts: true });
    const events = result.item[0].event;

    const prerequest = events.find((e) => e.listen === 'prerequest');
    const test = events.find((e) => e.listen === 'test');

    expect(prerequest.script.exec).toEqual(['bru.setEnvVar(\'token\', \'123\')']);
    expect(test.script.exec).toEqual(['test(\'status is 200\', function () {', '  expect(res.getStatus()).to.equal(200);', '});']);
    expect(prerequest.script.exec.join('\n')).not.toContain('pm.');
  });

  it('should translate scripts to pm.* by default when the option is not enabled', () => {
    const result = brunoToPostman(brunoCollectionWithScripts);
    const prerequest = result.item[0].event.find((e) => e.listen === 'prerequest');

    expect(prerequest.script.exec.join('\n')).toContain('pm.environment.set');
  });

  it('should keep the tests block as is instead of translating it', () => {
    const brunoCollectionWithTests = {
      name: 'Bruno Collection',
      items: [
        {
          name: 'Get User',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com/users',
            tests: 'test(\'is ok\', function () {\n  expect(res.getStatus()).to.equal(200);\n});'
          }
        }
      ]
    };

    const result = brunoToPostman(brunoCollectionWithTests, { preserveScripts: true });
    // A request's `tests` field is exported into the Postman test event
    const testEvent = result.item[0].event.find((e) => e.listen === 'test');

    expect(testEvent.script.exec.join('\n')).toContain('test(\'is ok\', function () {');
    expect(testEvent.script.exec.join('\n')).toContain('expect(res.getStatus()).to.equal(200)');
    expect(testEvent.script.exec.join('\n')).not.toContain('pm.');
  });

  it('should merge a post-response script and a tests block into one test event without translating either', () => {
    const brunoCollectionWithResAndTests = {
      name: 'Bruno Collection',
      items: [
        {
          name: 'Get User',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com/users',
            script: {
              res: 'bru.setVar(\'userId\', \'42\');'
            },
            tests: 'test(\'is ok\', function () {\n  expect(bru.getVar(\'userId\')).to.equal(\'42\');\n});'
          }
        }
      ]
    };

    const result = brunoToPostman(brunoCollectionWithResAndTests, { preserveScripts: true });
    const testEvent = result.item[0].event.find((e) => e.listen === 'test');

    // res and tests bodies are carried verbatim
    expect(testEvent.script.exec).toEqual([
      'bru.setVar(\'userId\', \'42\');',
      '',
      '// Tests',
      'test(\'is ok\', function () {',
      '  expect(bru.getVar(\'userId\')).to.equal(\'42\');',
      '});'
    ]);
    expect(testEvent.script.exec.join('\n')).not.toContain('pm.');
  });
});

describe('Preserve scripts option across a full round trip', () => {
  const prerequestExec = [
    '// Fetch an auth token before the request runs',
    'const token = pm.environment.get(\'authToken\');',
    '',
    'if (!token) {',
    '  pm.sendRequest({',
    '    url: pm.environment.get(\'baseUrl\') + \'/auth/login\',',
    '    method: \'POST\'',
    '  }, function (err, res) {',
    '    pm.environment.set(\'authToken\', res.json().token);',
    '  });',
    '}'
  ];
  const testExec = [
    'pm.test(\'status is 200\', function () {',
    '  pm.response.to.have.status(200);',
    '});',
    '',
    'pm.test(\'has user id\', function () {',
    '  const body = pm.response.json();',
    '  pm.expect(body).to.have.property(\'id\');',
    '});'
  ];

  const postmanCollectionWithRealisticScripts = {
    info: {
      _postman_id: 'preserve-roundtrip-test',
      name: 'Round Trip Collection',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: [
      {
        name: 'Login',
        request: { method: 'POST', url: 'https://example.com/login' },
        event: [
          { listen: 'prerequest', script: { type: 'text/javascript', exec: prerequestExec } },
          { listen: 'test', script: { type: 'text/javascript', exec: testExec } }
        ]
      }
    ]
  };

  it('should keep a multi-line script identical after a round trip conversion', async () => {
    const { collection } = await postmanToBruno(postmanCollectionWithRealisticScripts, { preserveScripts: true });
    const brunoRequest = collection.items[0].request;

    expect(brunoRequest.script.req).toBe(prerequestExec.join('\n'));
    expect(brunoRequest.script.res).toBe(testExec.join('\n'));

    const result = brunoToPostman(collection, { preserveScripts: true });
    const events = result.item[0].event;
    const prerequest = events.find((e) => e.listen === 'prerequest');
    const test = events.find((e) => e.listen === 'test');

    expect(prerequest.script.exec).toEqual(prerequestExec);
    expect(test.script.exec).toEqual(testExec);
  });
});
