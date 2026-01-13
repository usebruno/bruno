import translateCode from '../../../../src/utils/postman-to-bruno-translator';

describe('Combined API Features Translation', () => {
  // Basic translation test
  it('should translate code', () => {
    const code = 'console.log("Hello, world!");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(code);
  });

  // Preserving comments
  it('should preserve comments', () => {
    const code = '// This is a comment';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('// This is a comment');
  });

  it('should preserve comments inside functions', () => {
    const code = `
        function getUserDetails() {
            // Get user details from API
            const response = pm.response.json();
        }
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        function getUserDetails() {
            // Get user details from API
            const response = res.getBody();
        }
        `);
  });

  it('should preserve comments inside if statements', () => {
    const code = `
        if (pm.response.code === 200) {
            // Success
            console.log("Success");
        }
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        if (res.getStatus() === 200) {
            // Success
            console.log("Success");
        }
        `);
  });

  it('should preserve multiline comments', () => {
    const code = `
        /*
        This is a multiline comment
        */
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        /*
        This is a multiline comment
        */
        `);
  });

  it('should preserve comments inside for loops', () => {
    const code = `
        for (let i = 0; i < 10; i++) {
            // Loop iteration
            console.log(pm.response.json()[i]);
        }
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        for (let i = 0; i < 10; i++) {
            // Loop iteration
            console.log(res.getBody()[i]);
        }
        `);
  });

  // Multiple transformations in the same code block
  it('should handle multiple translations in the same code block', () => {
    const code = `
        const token = pm.environment.get("authToken");
        pm.test("Auth flow works", function() {
            const response = pm.response.json();
            pm.expect(response.authenticated).to.be.true;
            pm.environment.set("userId", response.user.id);
            pm.collectionVariables.set("sessionId", response.session.id);
        });
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).not.toContain('pm.test("Auth flow works", function() {');
    expect(translatedCode).not.toContain('pm.expect(response.authenticated).to.be.true;');
    expect(translatedCode).not.toContain('pm.environment.set("userId", response.user.id);');
    expect(translatedCode).not.toContain('pm.collectionVariables.set("sessionId", response.session.id);');
    expect(translatedCode).toContain('const token = bru.getEnvVar("authToken");');
    expect(translatedCode).toContain('test("Auth flow works", function() {');
    expect(translatedCode).toContain('const response = res.getBody();');
    expect(translatedCode).toContain('expect(response.authenticated).to.be.true;');
    expect(translatedCode).toContain('bru.setEnvVar("userId", response.user.id);');
    expect(translatedCode).toContain('bru.setVar("sessionId", response.session.id);');
  });

  // Nested expressions
  it('should handle nested Postman API calls', () => {
    const code = 'pm.environment.set("computed", pm.variables.get("base") + "-suffix");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('bru.setEnvVar("computed", bru.getVar("base") + "-suffix");');
  });

  it('should handle more complex nested expressions', () => {
    const code = 'pm.collectionVariables.set("fullPath", pm.environment.get("baseUrl") + pm.variables.get("endpoint"));';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('bru.setVar("fullPath", bru.getEnvVar("baseUrl") + bru.getVar("endpoint"));');
  });

  // Unrelated code
  it('should leave unrelated code untouched', () => {
    const code = `
        function calculateTotal(items) {
            return items.reduce((sum, item) => sum + item.price, 0);
        }
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(code);
  });

  it('should handle Postman API calls within JavaScript methods', () => {
    const code = `
        const helpers = {
            getAuthHeader: function() {
                return "Bearer " + pm.environment.get("token");
            }
        };
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toContain('return "Bearer " + bru.getEnvVar("token");');
  });

  it('should handle aliases with object destructuring', () => {
    const code = `
        const { environment, variables } = pm;
        environment.set("token", "abc123");
        variables.get("userId");
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toBe(`
        bru.setEnvVar("token", "abc123");
        bru.getVar("userId");
        `);
  });

  // Code context tests
  it('should translate pm commands inside functions', () => {
    const code = `
        function getAuthHeader() {
            return "Bearer " + pm.environment.get("token");
        }
        `;

    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        function getAuthHeader() {
            return "Bearer " + bru.getEnvVar("token");
        }
        `);
  });

  it('should translate pm commands inside if statements', () => {
    const code = `
        if (pm.response.code === 200) {
            console.log("Success");
        }
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        if (res.getStatus() === 200) {
            console.log("Success");
        }
        `);
  });

  it('should translate pm commands inside if statements', () => {
    const code = `
        const json = pm.response.json();
        if (json.code === 200) {
            console.log("Success");
        }
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        const json = res.getBody();
        if (json.code === 200) {
            console.log("Success");
        }
        `);
  });

  it('should translate pm commands inside else statements', () => {
    const code = `
        if (pm.response.code === 200) {
            console.log("Success");
            pm.response.to.have.status(200);
        } else {
            console.log("Failure");
            expect(res.getStatus()).to.equal(400);
        }
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        if (res.getStatus() === 200) {
            console.log("Success");
            expect(res.getStatus()).to.equal(200);
        } else {
            console.log("Failure");
            expect(res.getStatus()).to.equal(400);
        }
        `);
  });

  it('should translate pm commands inside for loops', () => {
    const code = `
        for (let i = 0; i < pm.response.json().length; i++) {
            console.log(pm.response.json()[i]);
        }
        `;

    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        for (let i = 0; i < res.getBody().length; i++) {
            console.log(res.getBody()[i]);
        }
        `);
  });

  it('should translate pm commands inside while loops', () => {
    const code = `
        while (pm.response.code === 200) {
            console.log("Success");
        }
        `;

    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        while (res.getStatus() === 200) {
            console.log("Success");
        }
        `);
  });

  it('should translate pm commands inside switch statements', () => {
    const code = `
        switch (pm.response.code) {
            case 200:
                console.log("Success");
                break;
        }
        `;

    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        switch (res.getStatus()) {
            case 200:
                console.log("Success");
                break;
        }
        `);
  });

  it('should translate pm commands inside try catch statements', () => {
    const code = `
        try {
            pm.response.to.have.status(200);
        } catch (error) {
            console.log("Failure");
            expect(res.getStatus()).to.equal(400);
        }
        `;

    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        try {
            expect(res.getStatus()).to.equal(200);
        } catch (error) {
            console.log("Failure");
            expect(res.getStatus()).to.equal(400);
        }
        `);
  });

  it('should translate aliases within if statements block', () => {
    const code = `
        const env = pm.environment;
        const vars = pm.variables;
        const collVars = pm.collectionVariables;
        const test = pm.test;
        const expect = pm.expect;
        const response = pm.response;
        
        function processResponse() {
          if(response.code === 200) {
            console.log("Success");
          } else if(response.code === 400) {
            console.log("Failure");
            expect(response.code).to.equal(400);
          } else {
            console.log("Unknown status code");
            expect(response.code).to.equal(500);
          }
        }
        `;

    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        function processResponse() {
          if(res.getStatus() === 200) {
            console.log("Success");
          } else if(res.getStatus() === 400) {
            console.log("Failure");
            expect(res.getStatus()).to.equal(400);
          } else {
            console.log("Unknown status code");
            expect(res.getStatus()).to.equal(500);
          }
        }
        `);
  });

  it('should handle pm aliases inside functions', () => {
    const code = `
        const tempRes = pm.response;
        const tempTest = pm.test;
        const tempExpect = pm.expect;
        const tempEnv = pm.environment;
        const tempVars = pm.variables;
        const tempCollVars = pm.collectionVariables;

        function processResponse() {
            tempTest("Status code is 200", function() { expect(tempRes.code).to.equal(200); });
            tempEnv.set("userId", tempRes.json().userId);
            tempVars.set("token", tempRes.json().token);
            tempCollVars.set("sessionId", tempRes.json().sessionId);
        }
        `;

    const translatedCode = translateCode(code);

    expect(translatedCode).toBe(`
        function processResponse() {
            test("Status code is 200", function() { expect(res.getStatus()).to.equal(200); });
            bru.setEnvVar("userId", res.getBody().userId);
            bru.setVar("token", res.getBody().token);
            bru.setVar("sessionId", res.getBody().sessionId);
        }
        `);
  });

  it('should nested pm commands', () => {
    const code = `
        pm.collectionVariables.get(pm.environment.get('key'))
        pm.test("Status code is 200", function() {
            pm.response.to.have.status(200);
        });
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        bru.getVar(bru.getEnvVar('key'))
        test("Status code is 200", function() {
            expect(res.getStatus()).to.equal(200);
        });
        `);
  });

  it('should handle pm objects in template literals', () => {
    const code = `
        const baseUrl = pm.environment.get("baseUrl");
        const endpoint = pm.variables.get("endpoint");
        const url = \`\${baseUrl}/api/\${endpoint}\`;
        console.log(\`Response status: \${pm.response.code}\`);
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('const baseUrl = bru.getEnvVar("baseUrl");');
    expect(translatedCode).toContain('const endpoint = bru.getVar("endpoint");');
    expect(translatedCode).toContain('const url = `${baseUrl}/api/${endpoint}`;');
    expect(translatedCode).toContain('console.log(`Response status: ${res.getStatus()}`);');
  });

  it('should handle pm objects in arrow functions', () => {
    const code = `
        const getAuthHeader = () => "Bearer " + pm.environment.get("token");
        const processItems = items => items.forEach(item => {
            pm.variables.set(item.key, item.value);
        });
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('const getAuthHeader = () => "Bearer " + bru.getEnvVar("token");');
    expect(translatedCode).toContain('const processItems = items => items.forEach(item => {');
    expect(translatedCode).toContain('bru.setVar(item.key, item.value);');
  });

  it('test', () => {
    const code = `
        const globals = pm.globals;
        const key = globals.get("key");
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        const key = bru.getGlobalEnvVar("key");
        `);
  });

  it('should handle pm.response.to.have.body integrated with other assertions', () => {
    const code = `
        pm.test("Response validation", function() {
            pm.response.to.have.status(200);
            pm.response.to.have.body({"success": true});
            pm.response.to.have.header("Content-Type", "application/json");
        });
        `;
    const translatedCode = translateCode(code);

    const expectedOutput = `
        test("Response validation", function() {
            expect(res.getStatus()).to.equal(200);
            expect(res.getBody()).to.equal({"success": true});
            expect(res.getHeaders()).to.have.property("Content-Type".toLowerCase(), "application/json");
        });
        `;
    expect(translatedCode).toBe(expectedOutput);
  });

  it('should handle pm.response.to.have.body with dynamic content', () => {
    const code = `
        const expectedResponse = {
            id: pm.environment.get("userId"),
            token: pm.variables.get("authToken"),
            timestamp: new Date().getTime()
        };
        
        pm.test("Dynamic response validation", function() {
            pm.response.to.have.body(expectedResponse);
        });
        `;
    const translatedCode = translateCode(code);

    const expectedOutput = `
        const expectedResponse = {
            id: bru.getEnvVar("userId"),
            token: bru.getVar("authToken"),
            timestamp: new Date().getTime()
        };
        
        test("Dynamic response validation", function() {
            expect(res.getBody()).to.equal(expectedResponse);
        });
        `;
    expect(translatedCode).toBe(expectedOutput);
  });

  it('should handle pm.response.to.have.body in control structures', () => {
    const code = `
        const jsonData = pm.response.json();
        
        if (jsonData.status === "success") {
            pm.response.to.have.body({
                status: "success",
                data: jsonData.data
            });
        } else {
            pm.expect(jsonData.error).to.exist;
        }
        `;
    const translatedCode = translateCode(code);

    const expectedOutput = `
        const jsonData = res.getBody();
        
        if (jsonData.status === "success") {
            expect(res.getBody()).to.equal({
                status: "success",
                data: jsonData.data
            });
        } else {
            expect(jsonData.error).to.exist;
        }
        `;
    expect(translatedCode).toBe(expectedOutput);
  });
});
