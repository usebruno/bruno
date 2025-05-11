const path = require("node:path");
const { describe, it, expect } = require('@jest/globals');
const constants = require('../../src/constants');
const { createCollectionJsonFromPathname } = require('../../src/utils/collection');

describe('create collection json from pathname', () => {
    it("should throw an error when the pathname is not a valid bruno collection root", () => {
        const invalidCollectionPathname = path.join(__dirname, './fixtures/collection-invalid');
        jest.spyOn(console, 'error').mockImplementation(() => {  });
        let mockProcessExit = jest.spyOn(process, 'exit').mockImplementation((code) => { throw new Error(code); });
        try { createCollectionJsonFromPathname(invalidCollectionPathname); } catch {}
        expect(mockProcessExit).toHaveBeenCalledWith(constants.EXIT_STATUS.ERROR_NOT_IN_COLLECTION);
        jest.restoreAllMocks();
    })

    it("creates a bruno collection json from the collection bru files", () => {
        const collectionPathname = path.join(__dirname, './fixtures/collection-json-from-pathname/collection');
        const outputCollectionJson = createCollectionJsonFromPathname(collectionPathname);

        let c = outputCollectionJson;
        expect(c).toBeDefined();
    
        /*
            collection bruno.json
        */

        expect(c).toHaveProperty('brunoConfig.version', "1");
        expect(c).toHaveProperty('brunoConfig.name', 'collection');
        expect(c).toHaveProperty('brunoConfig.type', 'collection');
        expect(c).toHaveProperty('brunoConfig.ignore', ["node_modules", ".git"]);
        expect(c).toHaveProperty('brunoConfig.proxy.enabled', false);
        expect(c).toHaveProperty('brunoConfig.proxy.protocol', 'http');
        expect(c).toHaveProperty('brunoConfig.proxy.hostname', '<proxy-hostname>');
        expect(c).toHaveProperty('brunoConfig.proxy.port', 3000);
        expect(c).toHaveProperty('brunoConfig.proxy.auth.enabled', false);
        expect(c).toHaveProperty('brunoConfig.proxy.auth.username', '<user-name>');
        expect(c).toHaveProperty('brunoConfig.proxy.auth.password', '<password>');
        expect(c).toHaveProperty('brunoConfig.proxy.bypassProxy', '');
        expect(c).toHaveProperty('brunoConfig.scripts.moduleWhitelist', ['crypto', 'buffer']);
        expect(c).toHaveProperty('brunoConfig.scripts.filesystemAccess.allow', true);
        expect(c).toHaveProperty('brunoConfig.clientCertificates.enabled', true);
        expect(c).toHaveProperty('brunoConfig.clientCertificates.certs', []);

        /*
            collection pathname
        */

        expect(c).toHaveProperty('pathname', collectionPathname);

        
        /*
            collection root
        */

        // headers
        expect(c).toHaveProperty('root.request.headers[0].name', 'collection_header');
        expect(c).toHaveProperty('root.request.headers[0].value', 'collection_header_value');
        expect(c).toHaveProperty('root.request.headers[0].enabled', true);
        // auth
        expect(c).toHaveProperty('root.request.auth.mode', 'basic');
        expect(c).toHaveProperty('root.request.auth.basic.username', 'username');
        expect(c).toHaveProperty('root.request.auth.basic.password', 'password');
        // pre-request scripts
        expect(c).toHaveProperty('root.request.script.req', 'const collectionPreRequestScript = true;');
        // collection root - post-response scripts
        expect(c).toHaveProperty('root.request.script.res', 'const collectionPostResponseScript = true;');
        // pre-request vars
        expect(c).toHaveProperty('root.request.vars.req[0].name', 'collection_pre_var');
        expect(c).toHaveProperty('root.request.vars.req[0].value', 'collection_pre_var_value');
        expect(c).toHaveProperty('root.request.vars.req[0].enabled', true);
        // post-response vars
        expect(c).toHaveProperty('root.request.vars.res[0].name', 'collection_post_var');
        expect(c).toHaveProperty('root.request.vars.res[0].value', 'collection_post_var_value');
        expect(c).toHaveProperty('root.request.vars.res[0].enabled', true);
        // tests
        expect(c).toHaveProperty('root.request.tests', 'test(\"collection level script\", function() {\n  expect(\"test\").to.equal(\"test\");\n});');


        /*
            collection items names and sequences
        */

        // <collection-root>/folder_2
        expect(c).toHaveProperty('items[0].type', 'folder');
        expect(c).toHaveProperty('items[0].name', 'folder_2');
        expect(c).toHaveProperty('items[0].seq', 1);

        // <collection-root>/folder_2/request_1
        expect(c).toHaveProperty('items[0].items[0].name', 'request_1');
        expect(c).toHaveProperty('items[0].items[0].seq', 1);

        // <collection-root>/folder_2/request_3
        expect(c).toHaveProperty('items[0].items[1].name', 'request_3');
        expect(c).toHaveProperty('items[0].items[1].seq', 2);

        // <collection-root>/folder_2/request_2
        expect(c).toHaveProperty('items[0].items[2].name', 'request_2');
        expect(c).toHaveProperty('items[0].items[2].seq', 3);

        // <collection-root>/folder_1
        expect(c).toHaveProperty('items[1].type', 'folder');
        expect(c).toHaveProperty('items[1].name', 'folder_1');
        expect(c).toHaveProperty('items[1].seq', 5);
        
        // <collection-root>/folder_1/folder_2
        expect(c).toHaveProperty('items[1].items[0].name', 'folder_2');
        expect(c).toHaveProperty('items[1].items[0].seq', 1);

        // <collection-root>/folder_1/folder_2/request_3
        expect(c).toHaveProperty('items[1].items[0].items[0].name', 'request_3');
        expect(c).toHaveProperty('items[1].items[0].items[0].seq', 1);

        // <collection-root>/folder_1/folder_2/request_1
        expect(c).toHaveProperty('items[1].items[0].items[1].name', 'request_1');
        expect(c).toHaveProperty('items[1].items[0].items[1].seq', 2);

        // <collection-root>/folder_1/folder_2/request_2
        expect(c).toHaveProperty('items[1].items[0].items[2].name', 'request_2');
        expect(c).toHaveProperty('items[1].items[0].items[2].seq', 3);

        // <collection-root>/folder_1/folder_1
        expect(c).toHaveProperty('items[1].items[1].name', 'folder_1');
        expect(c).toHaveProperty('items[1].items[1].seq', 2);

        // <collection-root>/folder_1/folder_1/request_3
        expect(c).toHaveProperty('items[1].items[1].items[0].name', 'request_3');
        expect(c).toHaveProperty('items[1].items[1].items[0].seq', 1);

        // <collection-root>/folder_1/folder_1/request_2
        expect(c).toHaveProperty('items[1].items[1].items[1].name', 'request_2');
        expect(c).toHaveProperty('items[1].items[1].items[1].seq', 2);

        // <collection-root>/folder_1/folder_1/request_1
        expect(c).toHaveProperty('items[1].items[1].items[2].name', 'request_1');
        expect(c).toHaveProperty('items[1].items[1].items[2].seq', 3);

        // <collection-root>/folder_1/request_1
        expect(c).toHaveProperty('items[1].items[2].name', 'request_1');
        expect(c).toHaveProperty('items[1].items[2].seq', 3);

        // <collection-root>/folder_1/request_3
        expect(c).toHaveProperty('items[1].items[3].name', 'request_3');
        expect(c).toHaveProperty('items[1].items[3].seq', 4);

        // <collection-root>/folder_1/request_2
        expect(c).toHaveProperty('items[1].items[4].name', 'request_2');
        expect(c).toHaveProperty('items[1].items[4].seq', 5);

        // <collection-root>/request_2
        expect(c).toHaveProperty('items[2].name', 'request_3');
        expect(c).toHaveProperty('items[2].seq', 2);

        // <collection-root>/request_3
        expect(c).toHaveProperty('items[3].name', 'request_1');
        expect(c).toHaveProperty('items[3].seq', 3);

        // <collection-root>/request_4
        expect(c).toHaveProperty('items[4].name', 'request_2');
        expect(c).toHaveProperty('items[4].seq', 4);


        /*
            collection request item - <collection-root>/request_4
        */
    
        // <collection-root>/request_4
        // headers
        expect(c).toHaveProperty('items[4].request.headers[0].name', 'request_header');
        expect(c).toHaveProperty('items[4].request.headers[0].value', 'request_header_value');
        expect(c).toHaveProperty('items[4].request.headers[0].enabled', true);
        // auth
        expect(c).toHaveProperty('items[4].request.auth.mode', 'basic');
        expect(c).toHaveProperty('items[4].request.auth.basic.username', 'username');
        expect(c).toHaveProperty('items[4].request.auth.basic.password', 'password');
        // pre-request scripts
        expect(c).toHaveProperty('items[4].request.script.req', 'const requestPreRequestScript = true;');
        // request items[4] - post-response scripts
        expect(c).toHaveProperty('items[4].request.script.res', 'const requestPostResponseScript = true;');
        // pre-request vars
        expect(c).toHaveProperty('items[4].request.vars.req[0].name', 'request_pre_var');
        expect(c).toHaveProperty('items[4].request.vars.req[0].value', 'request_pre_var_value');
        expect(c).toHaveProperty('items[4].request.vars.req[0].enabled', true);
        // post-response vars
        expect(c).toHaveProperty('items[4].request.vars.res[0].name', 'request_post_var');
        expect(c).toHaveProperty('items[4].request.vars.res[0].value', 'request_post_var_value');
        expect(c).toHaveProperty('items[4].request.vars.res[0].enabled', true);
        // tests
        expect(c).toHaveProperty('items[4].request.tests', 'test(\"request level script\", function() {\n  expect(\"test\").to.equal(\"test\");\n});');


    });
});