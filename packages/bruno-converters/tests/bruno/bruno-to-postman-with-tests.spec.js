import { brunoToPostman } from '../../src/postman/bruno-to-postman';

describe('Bruno to Postman Converter with Tests and Scripts', () => {
  const brunoCollection = {
    name: 'Script and Tests Collection',
    version: '1',
    items: [
      {
        name: 'Request With Scripts and Tests',
        type: 'http-request',
        filename: 'request-with-scripts.bru',
        seq: 1,
        settings: {
          encodeUrl: true,
          timeout: 0
        },
        tags: [],
        examples: [],
        request: {
          url: 'https://echo.usebruno.com',
          method: 'POST',
          headers: [],
          params: [],
          body: {
            mode: 'json',
            json: '{\n  "location": "root-request"\n}',
            formUrlEncoded: [],
            multipartForm: [],
            file: []
          },
          script: {
            req: 'console.log("root-request script line 1");\nconsole.log("root-request script line 2")',
            res: 'console.log("root-request script line 1");\nconsole.log("root-request script line 2")'
          },
          vars: {},
          assertions: [],
          tests: 'test("Status code is 200", () => {\n    expect(res.status).to.eql(200);\n});\ntest("Body is not empty", () => {\n    expect(res.body).not.to.eql("");\n});',
          docs: '',
          auth: {
            mode: 'none'
          }
        }
      },
      {
        type: 'folder',
        name: 'Scripts Folder',
        filename: 'scripts-folder',
        seq: 2,
        examples: [],
        root: {
          request: {
            auth: {
              mode: 'none'
            },
            script: {
              req: 'console.log("scripts-folder script line 1");\nconsole.log("scripts-folder script line 2")',
              res: 'console.log("scripts-folder script line 1");\nconsole.log("scripts-folder script line 2")'
            },
            tests: 'test("Status code is 200", () => {\n    expect(res.status).to.eql(200);\n});\ntest("Body is not empty", () => {\n    expect(res.body).not.to.eql("");\n});'
          },
          meta: {
            name: 'Scripts Folder',
            seq: 2
          }
        },
        items: [
          {
            type: 'http',
            name: 'Request In Scripts Folder',
            filename: 'scripts-folder-echo.bru',
            seq: 1,
            settings: {
              encodeUrl: true,
              timeout: 0
            },
            tags: [],
            examples: [],
            request: {
              url: 'https://echo.usebruno.com',
              method: 'POST',
              headers: [],
              params: [],
              body: {
                mode: 'json',
                json: '{\n  "location": "folder-request"\n}',
                formUrlEncoded: [],
                multipartForm: [],
                file: []
              },
              script: {
                req: 'console.log("scripts-folder-request script line 1");\nconsole.log("scripts-folder-request script line 2")',
                res: 'console.log("scripts-folder-request script line 1");\nconsole.log("scripts-folder-request script line 2")'
              },
              vars: {},
              assertions: [],
              tests: 'test("Status code is 200", () => {\n    expect(res.status).to.eql(200);\n});\ntest("Body is not empty", () => {\n    expect(res.body).not.to.eql("");\n});',
              docs: '',
              auth: {
                mode: 'none'
              }
            }
          },
          {
            type: 'folder',
            name: 'Scripts Inner Folder',
            filename: 'scripts-inner-folder',
            seq: 2,
            examples: [],
            root: {
              request: {
                auth: {
                  mode: 'none'
                },
                script: {
                  req: 'console.log("scripts-inner-folder script line 1");\nconsole.log("scripts-inner-folder script line 2")',
                  res: 'console.log("scripts-inner-folder script line 1");\nconsole.log("scripts-inner-folder script line 2")'
                },
                tests: 'test("Status code is 200", () => {\n    expect(res.status).to.eql(200);\n});\ntest("Body is not empty", () => {\n    expect(res.body).not.to.eql("");\n});'
              },
              meta: {
                name: 'Scripts Inner Folder',
                seq: 2
              }
            },
            items: [
              {
                type: 'http',
                name: 'Request In Scripts Inner Folder',
                filename: 'scripts-inner-folder-echo.bru',
                seq: 2,
                settings: {
                  encodeUrl: true,
                  timeout: 0
                },
                tags: [],
                examples: [],
                request: {
                  url: 'https://echo.usebruno.com',
                  method: 'POST',
                  headers: [],
                  params: [],
                  body: {
                    mode: 'json',
                    json: '{\n  "location": "inner-folder-request"\n}',
                    formUrlEncoded: [],
                    multipartForm: [],
                    file: []
                  },
                  script: {
                    req: 'console.log("scripts-inner-folder-request script line 1");\nconsole.log("scripts-inner-folder-request script line 2")',
                    res: 'console.log("scripts-inner-folder-request script line 1");\nconsole.log("scripts-inner-folder-request script line 2")'
                  },
                  vars: {},
                  assertions: [],
                  tests: 'test("Status code is 200", () => {\n    expect(res.status).to.eql(200);\n});\ntest("Body is not empty", () => {\n    expect(res.body).not.to.eql("");\n});',
                  docs: '',
                  auth: {
                    mode: 'none'
                  }
                }
              }
            ]
          }
        ]
      }
    ],
    environments: [],
    root: {
      request: {
        script: {
          req: 'console.log("root-request script line 1");\nconsole.log("root-request script line 2")',
          res: 'console.log("root-request script line 1");\nconsole.log("root-request script line 2")'
        },
        tests: 'test("Status code is 200", () => {\n    expect(res.status).to.eql(200);\n});\ntest("Body is not empty", () => {\n    expect(res.body).not.to.eql("");\n});'
      }
    },
    brunoConfig: {
      version: '1',
      name: 'Script and Tests Collection',
      type: 'collection',
      ignore: [
        'node_modules',
        '.git'
      ],
      size: 0.0020351409912109375,
      filesCount: 6
    }
  };

  it('should convert Bruno request scripts and tests to Postman event scripts', () => {
    const postmanCollection = brunoToPostman(brunoCollection);
    // Root request events
    const rootRequest = postmanCollection.item.find((i) => i.name === 'Request With Scripts and Tests');
    const rootPre = rootRequest.event.find((e) => e.listen === 'prerequest');
    const rootTest = rootRequest.event.find((e) => e.listen === 'test');
    expect(rootPre).toBeDefined();
    expect(rootTest).toBeDefined();
    expect(rootPre.script.exec).toEqual([
      'console.log("root-request script line 1");',
      'console.log("root-request script line 2")'
    ]);
    expect(rootTest.script.exec).toEqual([
      'console.log("root-request script line 1");',
      'console.log("root-request script line 2")',
      '',
      '// Tests',
      'pm.test("Status code is 200", () => {',
      '    pm.expect(pm.response.code).to.eql(200);',
      '});',
      'pm.test("Body is not empty", () => {',
      '    pm.expect(pm.response.body).not.to.eql("");',
      '});'
    ]);
  });

  it('should convert Bruno folder scripts and tests to Postman event scripts', () => {
    const postmanCollection = brunoToPostman(brunoCollection);
    // Folder events
    const folder = postmanCollection.item.find((i) => i.name === 'Scripts Folder');
    const folderPre = folder.event.find((e) => e.listen === 'prerequest');
    const folderTest = folder.event.find((e) => e.listen === 'test');
    expect(folderPre).toBeDefined();
    expect(folderTest).toBeDefined();
    expect(folderPre.script.exec).toEqual([
      'console.log("scripts-folder script line 1");',
      'console.log("scripts-folder script line 2")'
    ]);
    expect(folderTest.script.exec).toEqual([
      'console.log("scripts-folder script line 1");',
      'console.log("scripts-folder script line 2")',
      '',
      '// Tests',
      'pm.test("Status code is 200", () => {',
      '    pm.expect(pm.response.code).to.eql(200);',
      '});',
      'pm.test("Body is not empty", () => {',
      '    pm.expect(pm.response.body).not.to.eql("");',
      '});'
    ]);
  });

  it('should convert Bruno inner folder scripts and tests to Postman event scripts', () => {
    const postmanCollection = brunoToPostman(brunoCollection);
    const folder = postmanCollection.item.find((i) => i.name === 'Scripts Folder');
    // Inner folder events
    const innerFolder = folder.item.find((i) => i.name === 'Scripts Inner Folder');
    const innerFolderPre = innerFolder.event.find((e) => e.listen === 'prerequest');
    const innerFolderTest = innerFolder.event.find((e) => e.listen === 'test');
    expect(innerFolderPre).toBeDefined();
    expect(innerFolderTest).toBeDefined();
    expect(innerFolderPre.script.exec).toEqual([
      'console.log("scripts-inner-folder script line 1");',
      'console.log("scripts-inner-folder script line 2")'
    ]);
    expect(innerFolderTest.script.exec).toEqual([
      'console.log("scripts-inner-folder script line 1");',
      'console.log("scripts-inner-folder script line 2")',
      '',
      '// Tests',
      'pm.test("Status code is 200", () => {',
      '    pm.expect(pm.response.code).to.eql(200);',
      '});',
      'pm.test("Body is not empty", () => {',
      '    pm.expect(pm.response.body).not.to.eql("");',
      '});'
    ]);
  });

  it('should convert Bruno collection scripts and tests to Postman event scripts', () => {
    const postmanCollection = brunoToPostman(brunoCollection);
    // Collection events
    const collectionPre = postmanCollection.event.find((e) => e.listen === 'prerequest');
    const collectionTest = postmanCollection.event.find((e) => e.listen === 'test');
    expect(collectionPre).toBeDefined();
    expect(collectionTest).toBeDefined();
    expect(collectionPre.script.exec).toEqual([
      'console.log("root-request script line 1");',
      'console.log("root-request script line 2")'
    ]);
    expect(collectionTest.script.exec).toEqual([
      'console.log("root-request script line 1");',
      'console.log("root-request script line 2")',
      '',
      '// Tests',
      'pm.test("Status code is 200", () => {',
      '    pm.expect(pm.response.code).to.eql(200);',
      '});',
      'pm.test("Body is not empty", () => {',
      '    pm.expect(pm.response.body).not.to.eql("");',
      '});'
    ]);
  });
});
