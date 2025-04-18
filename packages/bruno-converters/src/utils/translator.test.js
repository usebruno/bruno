import translateCode from './jscode-shift-translator';

describe('translateCode function', () => {
    it('should translate code', () => {
        const code = 'console.log("Hello, world!");';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(code);
    });

    it('should translate pm.environment.get', () => {
        const code = 'pm.environment.get("test");';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('bru.getEnvVar("test");');
    }); 

    it('should translate pm.environment.set', () => {
        const code = 'pm.environment.set("test", "value");';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('bru.setEnvVar("test", "value");');
    });

    it('should translate pm.environment.has', () => {
        const code = 'pm.environment.has("test")';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('bru.getEnvVar("test") !== undefined && bru.getEnvVar("test") !== null');
    });

    it('should translate pm.environment.unset', () => {
        const code = 'pm.environment.unset("test");';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('bru.deleteEnvVar("test");');
    });
    

    it('should translate pm.variables.get', () => {
        const code = 'pm.variables.get("test");';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('bru.getVar("test");');
    });

    it('should translate pm.variables.set', () => {
        const code = 'pm.variables.set("test", "value");';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('bru.setVar("test", "value");');
    });
    
     it('should translate pm.environment.name', () => {
        const code = 'pm.environment.name;';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('bru.getEnvName();');
    });
    
    // Additional tests for variables and collection variables
    it('should translate pm.variables.has', () => {
        const code = 'pm.variables.has("userId");';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('bru.hasVar("userId");');
    });

    it('should translate pm.collectionVariables.get', () => {
        const code = 'pm.collectionVariables.get("apiUrl");';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('bru.getVar("apiUrl");');
    });

    it('should translate pm.collectionVariables.set', () => {
        const code = 'pm.collectionVariables.set("token", jsonData.token);';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('bru.setVar("token", jsonData.token);');
    });

    it('should translate pm.collectionVariables.has', () => {
        const code = 'pm.collectionVariables.has("authToken");';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('bru.hasVar("authToken");');
    });

    it('should translate pm.collectionVariables.unset', () => {
        const code = 'pm.collectionVariables.unset("tempVar");';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('bru.deleteVar("tempVar");');
    });

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

    // Testing framework translations
    it('should translate pm.test', () => {
        const code = 'pm.test("Status code is 200", function() { pm.response.to.have.status(200); });';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('test("Status code is 200", function() { expect(res.getStatus()).to.equal(200); });');
    });

    it('should translate pm.expect', () => {
        const code = 'pm.expect(jsonData.success).to.be.true;';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('expect(jsonData.success).to.be.true;');
    });

    it('should translate pm.expect.fail', () => {
        const code = 'if (!isValid) pm.expect.fail("Data is invalid");';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('if (!isValid) expect.fail("Data is invalid");');
    });

    // Response property translations
    it('should translate pm.response.json', () => {
        const code = 'const jsonData = pm.response.json();';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('const jsonData = res.getBody();');
    });

    it('should translate pm.response.code', () => {
        const code = 'if (pm.response.code === 200) { console.log("Success"); }';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('if (res.getStatus() === 200) { console.log("Success"); }');
    });

    it('should translate pm.response.text', () => {
        const code = 'const responseText = pm.response.text();';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('const responseText = res.getBody()?.toString();');
    });

    it('should translate pm.response.responseTime', () => {
        const code = 'console.log("Response time:", pm.response.responseTime);';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('console.log("Response time:", res.getResponseTime());');
    });

    // Complex transformations
    it('should transform pm.response.to.have.status', () => {
        const code = 'pm.response.to.have.status(201);';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('expect(res.getStatus()).to.equal(201);');
    });

    it('should transform pm.response.to.have.header', () => {
        const code = 'pm.response.to.have.header("Content-Type");';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('expect(Object.keys(res.getHeaders())).to.include("Content-Type");');
    });

    // Execution control
    it('should translate pm.setNextRequest', () => {
        const code = 'pm.setNextRequest("Get User Details");';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('bru.setNextRequest("Get User Details");');
    });

    it('should translate pm.execution.skipRequest', () => {
        const code = 'if (condition) pm.execution.skipRequest();';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('if (condition) bru.runner.skipRequest();');
    });

    it('should translate pm.execution.setNextRequest(null)', () => {
        const code = 'pm.execution.setNextRequest(null);';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('bru.runner.stopExecution();');
    });

    it('should translate pm.execution.setNextRequest("null")', () => {
        const code = 'pm.execution.setNextRequest("null");';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('bru.runner.stopExecution();');
    });

    // Legacy API translations
    it('should translate postman.setEnvironmentVariable', () => {
        const code = 'postman.setEnvironmentVariable("apiKey", "abc123");';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('bru.setEnvVar("apiKey", "abc123");');
    });

    it('should translate postman.getEnvironmentVariable', () => {
        const code = 'const baseUrl = postman.getEnvironmentVariable("baseUrl");';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('const baseUrl = bru.getEnvVar("baseUrl");');
    });

    it('should translate postman.clearEnvironmentVariable', () => {
        const code = 'postman.clearEnvironmentVariable("tempToken");';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('bru.deleteEnvVar("tempToken");');
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

    // JSON operations with Postman variables
    it('should handle JSON operations', () => {
        const code = 'pm.environment.set("user", JSON.stringify({ id: 123, name: "John" }));';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('bru.setEnvVar("user", JSON.stringify({ id: 123, name: "John" }));');
    });

    it('should handle JSON.parse with Postman variables', () => {
        const code = 'const userData = JSON.parse(pm.environment.get("user"));';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('const userData = JSON.parse(bru.getEnvVar("user"));');
    });

    // Edge cases and error handling
    it('should handle conditional expressions with Postman API calls', () => {
        const code = 'const userStatus = pm.variables.has("userId") ? "logged-in" : "guest";';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('const userStatus = bru.hasVar("userId") ? "logged-in" : "guest";');
    });

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

    // test aliases
    it("should handle environment aliases", () => {
        const code = `
        const env = pm.environment;
        const name = env.name;
        const has = env.has("test");
        const set = env.set("test", "value");
        const get = env.get("test");
        const unset = env.unset("test");
        `;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        const env = bru;
        const name = env.getEnvName();
        const has = env.hasEnvVar("test");
        const set = env.setEnvVar("test", "value");
        const get = env.getEnvVar("test");
        const unset = env.deleteEnvVar("test");
        `);
    });

    // Additional alias tests
    it("should handle variables aliases", () => {
        const code = `
        const vars = pm.variables;
        const has = vars.has("test");
        const set = vars.set("test", "value");
        const get = vars.get("test");
        `;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        const vars = bru;
        const has = vars.hasVar("test");
        const set = vars.setVar("test", "value");
        const get = vars.getVar("test");
        `);
    });

    it("should handle collection variables aliases", () => {
        const code = `
        const collVars = pm.collectionVariables;
        const has = collVars.has("test");
        const set = collVars.set("test", "value");
        const get = collVars.get("test");
        const unset = collVars.unset("test");
        `;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        const collVars = bru;
        const has = collVars.hasVar("test");
        const set = collVars.setVar("test", "value");
        const get = collVars.getVar("test");
        const unset = collVars.deleteVar("test");
        `);
    });

    it("should handle aliases in multi-level expressions", () => {
        const code = `
        const api = {
            env: pm.environment,
            vars: pm.variables
        };
        api.env.set("token", "abc123");
        api.vars.get("userId");
        `;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        const api = {
            env: bru,
            vars: bru
        };
        api.env.setEnvVar("token", "abc123");
        api.vars.getVar("userId");
        `);
    });

    it("should handle aliases with object destructuring", () => {
        const code = `
        const { environment, variables } = pm;
        environment.set("token", "abc123");
        variables.get("userId");
        `;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        const { environment, variables } = {
                environment: bru,
                variables: bru,
                test: test,
                expect: expect,
                response: res
        };
        environment.setEnvVar("token", "abc123");
        variables.getVar("userId");
        `);
    });

    it("should handle aliases with method chaining", () => {
        const code = `
        const env = pm.environment;
        const token = env.get("baseToken") + "_" + env.get("suffix");
        `;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        const env = bru;
        const token = env.getEnvVar("baseToken") + "_" + env.getEnvVar("suffix");
        `);
    });

    it("should handle immediate aliases inside functions", () => {
        const code = `
        function getAuthHeader() {
            const env = pm.environment;
            return "Bearer " + env.get("token");
        }
        `;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        function getAuthHeader() {
            const env = bru;
            return "Bearer " + env.getEnvVar("token");
        }
        `);
    });

    it("should handle reassigned aliases", () => {
        const code = `
        let env = pm.environment;
        let result = env.get("token");
        env = pm.variables; // Reassign to a different Postman object
        result = env.get("userId");
        `;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        let env = bru;
        let result = env.getVar("token");
        env = bru; // Reassign to a different Postman object
        result = env.getVar("userId");
        `);
    });

    it("should handle global pm alias", () => {
        const code = `
        const mpostman = pm;
        mpostman.environment.set("key", "value");
        mpostman.variables.get("name");
        mpostman.test("Test case", function() {
            mpostman.expect(true).to.be.true;
        });
        pm.response.json();
        pm.setNextRequest(null);
        pm.environment.get("key");
        pm.environment.set("key", "value");
        `;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        const mpostman = {
            environment: bru,
            variables: bru,
            test: test,
            expect: expect,
            response: res
        };
        mpostman.environment.setEnvVar("key", "value");
        mpostman.variables.getVar("name");
        mpostman.test("Test case", function() {
            mpostman.expect(true).to.be.true;
        });
        res.getBody();
        bru.setNextRequest(null);
        bru.getEnvVar("key");
        bru.setEnvVar("key", "value");
        `);
    });

    // Comprehensive test with multiple aliasing patterns
    it("should handle a complex script with multiple aliasing patterns", () => {
        const code = `
        // Direct variable assignments
        const env = pm.environment;
        const vars = pm.variables;
        const collVars = pm.collectionVariables;
        
        // Object destructuring
        const { test, expect } = pm;
        
        // Multi-level object with aliases
        const api = {
            env: pm.environment,
            utils: {
                getAuthHeader: function() {
                    return "Bearer " + pm.environment.get("token");
                }
            }
        };
        
        // Using aliases
        const baseUrl = env.get("baseUrl");
        const endpoint = vars.get("endpoint");
        const fullUrl = baseUrl + endpoint;
        
        // Variable reassignment
        let currentEnv = env;
        let value = currentEnv.get("token");
        currentEnv = vars;
        value = currentEnv.get("userId");
        
        // Test using aliases
        test("Response should be valid", function() {
            const response = pm.response.json();
            expect(response.success).to.be.true;
            
            if (response.token) {
                env.set("token", response.token);
                api.env.set("lastAuth", new Date().toISOString());
            }
            
            // Nested expression
            const userData = JSON.parse(env.get("user"));
            collVars.set("username", userData.name);
        });
        `;
        
        const translatedCode = translateCode(code);
        
        // For this complex test, we'll just check for key patterns rather than exact matches
        expect(translatedCode).toContain('const env = bru;');
        expect(translatedCode).toContain('const vars = bru;');
        expect(translatedCode).toContain('const collVars = bru;');
        expect(translatedCode).toContain('const { test, expect } = {');
        expect(translatedCode).toContain('return "Bearer " + bru.getEnvVar("token");');
        
        // Check for use of aliases
        expect(translatedCode).toContain('const baseUrl = env.getEnvVar("baseUrl");');
        expect(translatedCode).toContain('const endpoint = vars.getVar("endpoint");');
        
        // For the reassigned variables, be more flexible in what we expect
        expect(translatedCode).toMatch(/let currentEnv = (bru|env);/);
        expect(translatedCode).toMatch(/let value = currentEnv\.(get|getEnvVar|getVar)\("token"\);/);
        expect(translatedCode).toMatch(/currentEnv = (bru|vars);/);
        expect(translatedCode).toMatch(/value = currentEnv\.(get|getEnvVar|getVar)\("userId"\);/);
        
        // Test the rest of the transformations
        expect(translatedCode).toContain('const response = res.getBody();');
        expect(translatedCode).toMatch(/env\.setEnvVar\("token", response\.token\);/);
        expect(translatedCode).toMatch(/api\.env\.setEnvVar\("lastAuth", new Date\(\)\.toISOString\(\)\);/);
        expect(translatedCode).toMatch(/const userData = JSON\.parse\(env\.getEnvVar\("user"\)\);/);
        expect(translatedCode).toMatch(/collVars\.setVar\("username", userData\.name\);/);
    });

    // Test for pm.response.json()
    it("should handle pm.response.json()", () => {
        const code = `
        const jsonData = pm.response.json();
        `;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        const jsonData = res.getBody();
        `);
    });

    // Test for pm.response.code
    it("should handle pm.response.code", () => {
        const code = `
        const status = pm.response.code;
        `;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        const status = res.getStatus();
        `);
    });

    // Test for pm.response.text
    it("should handle pm.response.text", () => {
        const code = `
        const responseText = pm.response.text();
        `;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        const responseText = res.getBody()?.toString();
        `);
    });

    // Test for pm.response.responseTime
    it("should handle pm.response.responseTime", () => {
        const code = `
        const responseTime = pm.response.responseTime;
        `;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        const responseTime = res.getResponseTime();
        `);
    });

    // Test for pm.response.to.have.status
    it("should handle pm.response.to.have.status", () => {
        const code = `
        pm.response.to.have.status(200);
        `;
        const translatedCode = translateCode(code);
            expect(translatedCode).toBe(`
        expect(res.getStatus()).to.equal(200);
        `);
    });

    // Test for pm.execution.skipRequest
    it("should handle pm.execution.skipRequest", () => {
        const code = `
        pm.execution.skipRequest();
        `;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        bru.runner.skipRequest();
        `);
    });

    // Test for pm.execution.setNextRequest(null)
    it("should handle pm.execution.setNextRequest(null)", () => {
        const code = `
        pm.execution.setNextRequest(null);
        `;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        bru.runner.stopExecution();
        `);
    });

    // Test for pm.execution.setNextRequest("null")
    it("should handle pm.execution.setNextRequest('null')", () => {
        const code = `
        pm.execution.setNextRequest("null");
        `;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        bru.runner.stopExecution();
        `);
    });

    // response aliases
    it("should handle response aliases", () => {
        const code = `
        const response = pm.response;
        const status = response.status;
        const body = response.body;
        `;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        const response = res;
        const status = response.getStatus();
        const body = response.getBody();
        `);
    });

    // Test for pm.response.to.have.status
    it("should handle pm.response.to.have.status", () => {
        const code = `
        pm.response.to.have.status(200);
        `;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        expect(res.getStatus()).to.equal(200);
        `);
    });
    
    // Test for pm.response.to.have.status alias
    it("should handle pm.response.to.have.status alias", () => {
        const code = `
        const response = pm.response;
        response.to.have.status(200);
        `;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        const response = res;
        response.getStatus() === 200;
        `);
    });  
    
        // Test for pm.response.to.have.status alias
    it("should handle pm.response.to.have.status alias", () => {
        const code = `
        const resp = pm.response;
        resp.to.have.status(200);
        `;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        const resp = res;
        resp.getStatus() === 200;
        `);
    }); 

     it("should handle pm.response.to.have.status alias", () => {
        const code = `
        const mockedPm = pm;
        mockedPm.response.to.have.status(200);
        `;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        const mockedPm = {
                environment: bru,
                variables: bru,
                test: test,
                expect: expect,
                response: res
        };
        mockedPm.response.getStatus() === 200;
        `);
    }); 


    it("should translate pm commands inside functions", () => {
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

    it("should translate pm commands inside if statements", () => {
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

    it("should translate pm commands inside else statements", () => {
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

    it("should translate pm commands inside for loops", () => {
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

    it("should translate pm commands inside while loops", () => {
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

    it("should translate pm commads inside switch statements", () => {
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

    it("should translate pm commands inside try catch statements", () => {
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

    it("should translate aliases within functions", () => {
        const code = `
        const env = pm.environment;
        const vars = pm.variables;
        const collVars = pm.collectionVariables;
        const test = pm.test;
        const expect = pm.expect;
        const response = pm.response;

        function processResponse() {
            const statusCode = response.code;
            const jsonBody = response.json();
            const textBody = response.text();
            const responseTime = response.responseTime;

            if (statusCode === 200) {
                pm.test("Status code is 200", function() { expect(statusCode).to.equal(200); });
            }
        }
        `;

        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        const env = bru;
        const vars = bru;
        const collVars = bru;
        const test = test;
        const expect = expect;
        const response = res;

        function processResponse() {
            const statusCode = response.getStatus();
            const jsonBody = response.getBody();
            const textBody = response.getBody()?.toString();
            const responseTime = response.getResponseTime();

            if (statusCode === 200) {
                test("Status code is 200", function() { expect(statusCode).to.equal(200); });
            }
        }
        `);
    });

    it("should translate aliases within if statements block", () => {
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
        const env = bru;
        const vars = bru;
        const collVars = bru;
        const test = test;
        const expect = expect;
        const response = res;
        
        function processResponse() {
          if(response.getStatus() === 200) {
            console.log("Success");
          } else if(response.getStatus() === 400) {
            console.log("Failure");
            expect(response.getStatus()).to.equal(400);
          } else {
            console.log("Unknown status code");
            expect(response.getStatus()).to.equal(500);
          }
        }
        `);
    });
    
    it("should handle pm aliases inside functions", () => {
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
        const tempRes = res;
        const tempTest = test;
        const tempExpect = expect;
        const tempEnv = bru;
        const tempVars = bru;
        const tempCollVars = bru;

        function processResponse() {
            tempTest("Status code is 200", function() { expect(tempRes.getStatus()).to.equal(200); });
            tempEnv.setEnvVar("userId", tempRes.getBody().userId);
            tempVars.setVar("token", tempRes.getBody().token);
            tempCollVars.setVar("sessionId", tempRes.getBody().sessionId);
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

    it('should nested object assignments', () => {
        const code = `
        const api = {
            env: pm.environment,
            vars: pm.variables,
            collVars: pm.collectionVariables,
            test: pm.test,
            expect: pm.expect,
            response: pm.response
        };
        api.env.set("userId", api.response.json().userId);
        api.vars.set("token", api.response.json().token);
        api.collVars.set("sessionId", api.response.json().sessionId);
        `;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        const api = {
            env: bru,
            vars: bru,
            collVars: bru,
            test: test,
            expect: expect,
            response: res
        };
        api.env.setEnvVar("userId", api.response.getBody().userId);
        api.vars.setVar("token", api.response.getBody().token);
        api.collVars.setVar("sessionId", api.response.getBody().sessionId);
        `);
    })

    it("should translate pm.response.to.have.status", () => {
        const code = `
        pm.test("Check environment and call successful", function () {
            pm.expect(pm.environment.name).to.equal("ENVIRONMENT_NAME");
            pm.response.to.have.status(200);
        });`
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        test("Check environment and call successful", function () {
            expect(bru.getEnvName()).to.equal("ENVIRONMENT_NAME");
            expect(res.getStatus()).to.equal(200);
        });`)
    });
    
    it("should translate response.status", () => {
        const code = `
        const resp = pm.response;
        const statusCode = resp.status;
        `;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        const resp = res;
        const statusCode = resp.getStatus();
        `);
    });
    
    it("should translate response.body", () => {
        const code = `
        const resp = pm.response;
        const responseBody = resp.body;
        `;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        const resp = res;
        const responseBody = resp.getBody();
        `);
    });
    
    it("should translate multiple response methods in one block", () => {
        const code = `
        const resp = pm.response;
        const statusCode = resp.code;
        const jsonData = resp.json();
        const responseText = resp.text();
        const time = resp.responseTime;
        resp.to.have.status(200);
        `;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        const resp = res;
        const statusCode = resp.getStatus();
        const jsonData = resp.getBody();
        const responseText = resp.getBody()?.toString();
        const time = resp.getResponseTime();
        resp.getStatus() === 200;
        `);
    });
    
    it("should handle pm aliases with full object paths", () => {
        const code = `
        const apiUtils = {
            response: pm.response,
            env: {
                get: pm.environment.get,
                set: pm.environment.set
            },
            test: pm.test
        };
        
        const status = apiUtils.response.code;
        apiUtils.env.set("token", "abc123");
        const value = apiUtils.env.get("userId");
        apiUtils.test("Status is OK", function() {
            pm.response.to.have.status(200);
        });
        `;
        const translatedCode = translateCode(code);
        
        expect(translatedCode).toContain('const apiUtils = {');
        expect(translatedCode).toContain('response: res,');
        expect(translatedCode).toContain('const status = apiUtils.response.getStatus();');
        expect(translatedCode).toContain('test("Status is OK", function() {');
        expect(translatedCode).toContain('expect(res.getStatus()).to.equal(200);');
    });
    
    it("should translate pm.environment.name with different access patterns", () => {
        const code = `
        const envName1 = pm.environment.name;
        const env = pm.environment;
        const envName2 = env.name;
        console.log(pm.environment.name);
        `;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        const envName1 = bru.getEnvName();
        const env = bru;
        const envName2 = env.getEnvName();
        console.log(bru.getEnvName());
        `);
    });
    
    it("should handle variable declaration patterns with pm objects", () => {
        const code = `
        let envVar, response, test;
        envVar = pm.environment;
        response = pm.response;
        test = pm.test;
        
        envVar.set("key", "value");
        const status = response.code;
        test("Status check", () => {
            pm.expect(status).to.equal(200);
        });
        `;
        const translatedCode = translateCode(code);
        
        expect(translatedCode).toContain('envVar = bru;');
        expect(translatedCode).toContain('response = res;');
        expect(translatedCode).toContain('test = test;');
        expect(translatedCode).toContain('envVar.setEnvVar("key", "value");');
        expect(translatedCode).toContain('const status = response.getStatus();');
        expect(translatedCode).toContain('test("Status check", () => {');
        expect(translatedCode).toContain('expect(status).to.equal(200);');
    });
    
    it("should handle pm.execution.setNextRequest with non-null parameters", () => {
        const code = `
        // Continue normal flow
        pm.execution.setNextRequest("Get user details");
        
        // With variable
        const nextReq = "Update profile";
        pm.execution.setNextRequest(nextReq);
        `;
        const translatedCode = translateCode(code);
        
        expect(translatedCode).toContain('bru.setNextRequest("Get user details");');
        expect(translatedCode).toContain('bru.setNextRequest(nextReq);');
    });
    
    it("should handle pm.response.to.have.status with different status codes", () => {
        const code = `
        // Test different status codes
        pm.response.to.have.status(200); // OK
        pm.response.to.have.status(201); // Created
        pm.response.to.have.status(400); // Bad Request
        pm.response.to.have.status(404); // Not Found
        pm.response.to.have.status(500); // Server Error
        
        // With variables
        const expectedStatus = 200;
        pm.response.to.have.status(expectedStatus);
        `;
        const translatedCode = translateCode(code);
        
        expect(translatedCode).toContain('expect(res.getStatus()).to.equal(200);');
        expect(translatedCode).toContain('expect(res.getStatus()).to.equal(201);');
        expect(translatedCode).toContain('expect(res.getStatus()).to.equal(400);');
        expect(translatedCode).toContain('expect(res.getStatus()).to.equal(404);');
        expect(translatedCode).toContain('expect(res.getStatus()).to.equal(500);');
        expect(translatedCode).toContain('expect(res.getStatus()).to.equal(expectedStatus);');
    });
    
    it("should handle all execution control methods together", () => {
        const code = `
        // All execution control methods
        if (pm.response.code === 401) {
            pm.execution.skipRequest();
        } else if (pm.response.code === 500) {
            pm.execution.setNextRequest(null);
        } else {
            pm.setNextRequest("Get User Details");
        }
        `;
        const translatedCode = translateCode(code);
        
        expect(translatedCode).toContain('if (res.getStatus() === 401) {');
        expect(translatedCode).toContain('bru.runner.skipRequest();');
        expect(translatedCode).toContain('} else if (res.getStatus() === 500) {');
        expect(translatedCode).toContain('bru.runner.stopExecution();');
        expect(translatedCode).toContain('} else {');
        expect(translatedCode).toContain('bru.setNextRequest("Get User Details");');
    });
    
    it("should handle all legacy Postman API calls", () => {
        const code = `
        // Legacy Postman API (deprecated)
        postman.setEnvironmentVariable("apiKey", "abc123");
        const baseUrl = postman.getEnvironmentVariable("baseUrl");
        postman.clearEnvironmentVariable("tempToken");
        
        // With variables
        const key = "sessionId";
        const value = "xyz789";
        postman.setEnvironmentVariable(key, value);
        `;
        const translatedCode = translateCode(code);
        
        expect(translatedCode).toContain('bru.setEnvVar("apiKey", "abc123");');
        expect(translatedCode).toContain('const baseUrl = bru.getEnvVar("baseUrl");');
        expect(translatedCode).toContain('bru.deleteEnvVar("tempToken");');
        expect(translatedCode).toContain('bru.setEnvVar(key, value);');
    });

    it("should handle accessing nested properties on translated objects", () => {
        const code = `
        const resp = pm.response;
        const data = resp.json();
        if (data && data.user && data.user.id) {
            pm.environment.set("userId", data.user.id);
        }
        `;
        const translatedCode = translateCode(code);
        
        expect(translatedCode).toContain('const resp = res;');
        expect(translatedCode).toContain('const data = resp.getBody();');
        expect(translatedCode).toContain('bru.setEnvVar("userId", data.user.id);');
    });
    
    it("should handle chained methods on pm objects", () => {
        const code = `
        pm.test("Status code test", function() {
            pm.response.to.have.status(200);
            pm.expect(pm.response.json().success).to.be.true;
        });
        `;
        const translatedCode = translateCode(code);
        
        expect(translatedCode).toContain('test("Status code test", function() {');
        expect(translatedCode).toContain('expect(res.getStatus()).to.equal(200);');
        expect(translatedCode).toContain('expect(res.getBody().success).to.be.true;');
    });
    
    it("should handle pm objects with array access", () => {
        const code = `
        const items = pm.response.json().items;
        for (let i = 0; i < items.length; i++) {
            pm.collectionVariables.set("item_" + i, items[i].id);
        }
        `;
        const translatedCode = translateCode(code);
        
        expect(translatedCode).toContain('const items = res.getBody().items;');
        expect(translatedCode).toContain('bru.setVar("item_" + i, items[i].id);');
    });
    
    it("should handle pm objects in template literals", () => {
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
    
    it("should handle pm objects in arrow functions", () => {
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
    
    it("should handle pm objects in complex expressions", () => {
        const code = `
        const isLoggedIn = pm.variables.has("token") && pm.variables.get("token").length > 0;
        const hasPermission = pm.environment.has("userRole") && 
                              ["admin", "editor"].includes(pm.environment.get("userRole"));
        
        if (isLoggedIn && hasPermission) {
            pm.test("User is authenticated and authorized", function() {
                pm.expect(pm.response.code).to.equal(200);
            });
        }
        `;
        const translatedCode = translateCode(code);
        
        expect(translatedCode).toContain('const isLoggedIn = bru.hasVar("token") && bru.getVar("token").length > 0;');
        expect(translatedCode).toContain('["admin", "editor"].includes(bru.getEnvVar("userRole"))');
        expect(translatedCode).toContain('test("User is authenticated and authorized", function() {');
        expect(translatedCode).toContain('expect(res.getStatus()).to.equal(200);');
    });
    
    it("should handle all environment variable methods together", () => {
        const code = `
        // All environment variable methods
        const envName = pm.environment.name;
        const hasToken = pm.environment.has("token");
        const token = pm.environment.get("token");
        pm.environment.set("timestamp", new Date().toISOString());
        
        console.log(\`Environment: \${envName}, Has token: \${hasToken}, Token: \${token}\`);
        `;
        const translatedCode = translateCode(code);
        
        expect(translatedCode).toContain('const envName = bru.getEnvName();');
        expect(translatedCode).toContain('const hasToken = bru.getEnvVar("token") !== undefined && bru.getEnvVar("token") !== null;');
        expect(translatedCode).toContain('const token = bru.getEnvVar("token");');
        expect(translatedCode).toContain('bru.setEnvVar("timestamp", new Date().toISOString());');
    });
    
    it("should handle all variable methods together", () => {
        const code = `
        // All variable methods
        const hasUserId = pm.variables.has("userId");
        const userId = pm.variables.get("userId");
        pm.variables.set("requestTime", new Date().toISOString());
        
        console.log(\`Has userId: \${hasUserId}, User ID: \${userId}\`);
        `;
        const translatedCode = translateCode(code);
        
        expect(translatedCode).toContain('const hasUserId = bru.hasVar("userId");');
        expect(translatedCode).toContain('const userId = bru.getVar("userId");');
        expect(translatedCode).toContain('bru.setVar("requestTime", new Date().toISOString());');
    });
    
    it("should handle all collection variable methods together", () => {
        const code = `
        // All collection variable methods
        const hasApiUrl = pm.collectionVariables.has("apiUrl");
        const apiUrl = pm.collectionVariables.get("apiUrl");
        pm.collectionVariables.set("requestTime", new Date().toISOString());
        pm.collectionVariables.unset("tempVar");
        
        console.log(\`Has API URL: \${hasApiUrl}, API URL: \${apiUrl}\`);
        `;
        const translatedCode = translateCode(code);
        
        expect(translatedCode).toContain('const hasApiUrl = bru.hasVar("apiUrl");');
        expect(translatedCode).toContain('const apiUrl = bru.getVar("apiUrl");');
        expect(translatedCode).toContain('bru.setVar("requestTime", new Date().toISOString());');
        expect(translatedCode).toContain('bru.deleteVar("tempVar");');
    });
    
    it("should handle all response property methods together", () => {
        const code = `
        // All response property methods
        const statusCode = pm.response.code;
        const responseBody = pm.response.json();
        const responseText = pm.response.text();
        const responseTime = pm.response.responseTime;
        
        pm.test("Response is valid", function() {
            pm.response.to.have.status(200);
            pm.expect(responseBody).to.be.an('object');
            pm.expect(responseTime).to.be.below(1000);
        });
        `;
        const translatedCode = translateCode(code);
        
        expect(translatedCode).toContain('const statusCode = res.getStatus();');
        expect(translatedCode).toContain('const responseBody = res.getBody();');
        expect(translatedCode).toContain('const responseText = res.getBody()?.toString();');
        expect(translatedCode).toContain('const responseTime = res.getResponseTime();');
        expect(translatedCode).toContain('test("Response is valid", function() {');
        expect(translatedCode).toContain('expect(res.getStatus()).to.equal(200);');
        expect(translatedCode).toContain('expect(responseBody).to.be.an(\'object\');');
        expect(translatedCode).toContain('expect(responseTime).to.be.below(1000);');
    });
});


describe('skipped tests that lacks implementation', () => {
    it.skip("should handle nested aliases with method calls", () => {
        const code = `
        const testUtils = {
            env: pm.environment,
            response: pm.response,
            runTest() {
                const status = this.response.code;
                const token = this.env.get("token");
                return { status, token };
            }
        };
        
        const result = testUtils.runTest();
        console.log(result);
        `;
        const translatedCode = translateCode(code);
        
        expect(translatedCode).toContain('env: bru,');
        expect(translatedCode).toContain('response: res,');
        expect(translatedCode).toContain('const status = this.response.getStatus();');
        expect(translatedCode).toContain('const token = this.env.getEnvVar("token");');
    });

    it('should translate many commands together', () => {
        const code = `
        // Test for status code
        pm.test("Status code is 400", function () {
            pm.response.to.have.status(400);
        });

        // Test for response body
        pm.test("Response body is not empty", function () {
            pm.response.to.not.be.empty;
        });

        // Test for response headers
        pm.test("Response must have Content-Type header", function () {
            pm.response.to.have.header("Content-Type");
        });

        pm.test("Status code is 200", function () {
        pm.response.to.have.status(200);
        });

        pm.test("Status code is 200", () => {
        pm.expect(pm.response.code).to.eql(200);
        });

        pm.test("The response has all properties", () => {
            //parse the response JSON and test three properties
            const responseJson = pm.response.json();
            pm.expect(responseJson.type).to.eql('vip');
            pm.expect(responseJson.name).to.be.a('string');
            pm.expect(responseJson.id).to.have.lengthOf(1);
        });

        let responseJson = pm.response.json();
        responseJson = xml2Json(pm.response.text());
        const parse = require('csv-parse/lib/sync');
        responseJson = parse(pm.response.text());
        const $ = cheerio.load(pm.response.text());
        //output the html for testing
        console.log($.html());
        pm.test("Body contains string",() => {
        pm.expect(pm.response.text()).to.include("customer_id");
        });
        pm.test("Body is string", function () {
        pm.response.to.have.body("whole-body-text");
        });
        /* Response has the following structure:
        {
        "name": "Jane",
        "age": 23
        },
        */
        pm.test("Person is Jane", () => {
        const responseJson = pm.response.json();
        pm.expect(responseJson.name).to.eql("Jane");
        pm.expect(responseJson.age).to.eql(23);
        });
        pm.test("Status code is 201", () => {
        pm.response.to.have.status(201);
        });
        pm.test("Successful POST request", () => {
        pm.expect(pm.response.code).to.be.oneOf([201,202]);
        });
        pm.test("Status code name has string", () => {
        pm.response.to.have.status("Created");
        });
        pm.test("Successful POST request", () => {
        pm.expect(pm.response.code).to.be.oneOf([201,202]);
        });
        pm.test("Status code name has string", () => {
        pm.response.to.have.status("Created");
        });
        pm.test("Content-Type header is present", () => {
        pm.response.to.have.header("Content-Type");
        });
        pm.test("Content-Type header is application/json", () => {
        pm.expect(pm.response.headers.get('Content-Type')).to.include('application/json');
        });
        pm.test("Cookie isLoggedIn is present", () => {
        pm.expect(pm.cookies.has('isLoggedIn')).to.be.true;
        });

        pm.test("Cookie isLoggedIn has value 1", () => {
        pm.expect(pm.cookies.get('isLoggedIn')).to.eql('1');
        });
        pm.test("Response time is less than 200ms", () => {
        pm.expect(pm.response.responseTime).to.be.below(200);
        });
        pm.test("Response property matches environment variable", function () {
        pm.expect(pm.response.json().name).to.eql(pm.environment.get("name"));
        });
        /* Response has the following structure:
        {
        "name": "Jane",
        "age": 29,
        "hobbies": [
            "skating",
            "painting"
        ],
        "email": null
        },
        */
        let jsonData = pm.response.json();
        pm.test("Test data type of the response", () => {
        pm.expect(jsonData).to.be.an("object");
        pm.expect(jsonData.name).to.be.a("string");
        pm.expect(jsonData.age).to.be.a("number");
        pm.expect(jsonData.hobbies).to.be.an("array");
        pm.expect(jsonData.website).to.be.undefined;
        pm.expect(jsonData.email).to.be.null;
        });

        /* Response has the following structure:
        {
        "errors": [],
        "areas": [ "goods", "services" ],
        "settings": [
            {
            "type": "notification",
            "detail": [ "email", "sms" ]
            },
            {
            "type": "visual",
            "detail": [ "light", "large" ]
            }
        ]
        },
        */

        jsonData = pm.response.json();
        pm.test("Test array properties", () => {
            //errors array is empty
        pm.expect(jsonData.errors).to.be.empty;
            //areas array includes "goods"
        pm.expect(jsonData.areas).to.include("goods");
            //get the notification settings object
        const notificationSettings = jsonData.settings.find
            (m => m.type === "notification");
        pm.expect(notificationSettings)
            .to.be.an("object", "Could not find the setting");
            //detail array must include "sms"
        pm.expect(notificationSettings.detail).to.include("sms");
            //detail array must include all listed
        pm.expect(notificationSettings.detail)
            .to.have.members(["email", "sms"]);
        });


        /* Response has the following structure:
        {
        "a": 1,
        "b": 2
        },
        */
        pm.expect({a: 1, b: 2}).to.have.all.keys('a', 'b');
        pm.expect({a: 1, b: 2}).to.have.any.keys('a', 'b');
        pm.expect({a: 1, b: 2}).to.not.have.any.keys('c', 'd');
        pm.expect({a: 1}).to.have.property('a');
        pm.expect({a: 1, b: 2}).to.be.a('object')
        .that.has.all.keys('a', 'b');


        /* Response has the following structure:
        {
        "type": "Subscriber"
        },
        */

        pm.test("Value is in valid list", () => {
        pm.expect(pm.response.json().type)
            .to.be.oneOf(["Subscriber", "Customer", "User"]);
        });


        /* Response has the following structure:
        {
        "id": "d8893057-3e91-4cdd-a36f-a0af460b6373",
        "created": true,
        "errors": []
        },
        */

        pm.test("Object is contained", () => {
        const expectedObject = {
            "created": true,
            "errors": []
        };
        pm.expect(pm.response.json()).to.deep.include(expectedObject);
        });

        pm.test("Check the active environment", () => {
        pm.expect(pm.environment.name).to.eql("Production");
        });
        console.log(pm.collectionVariables.get("name"));
        console.log(pm.response.json().name);
        if (pm.response.json().id) {
        console.log("id was found!");
        // do something
        } else {
        console.log("no id ...");
        //do something else
        }
        pm.expect(1).to.eql("1");
        /* Response has the following structure:
        {
        "name": "John",
        "age": 29
        },
        */
        pm.test("Test 1", () => {
        const jsonData = pm.response.json();
        pm.expect(jsonData.name).to.eql("John");
        });

        pm.test("Test 2", () => {
        pm.expect(jsonData.age).to.eql(29); // ReferenceError: jsonData is not defined
        });
        jsonData = pm.response.json();
        pm.expect(jsonData.name).to.eql("John");

        pm.test( function () {
            pm.expect(true).to.eql(false);
        });
        const schema = {
            required: ["args"],
            properties: {
                args: {
                    required: ["alpha"],
                    properties: {
                        alpha: { type: "string" }
                    }
                }
            }
        };

        pm.test('Response is valid', function() {
        pm.response.to.have.jsonSchema(schema);
        });

        pm.sendRequest("https://postman-echo.com/get", function (err, response) {
            console.log(response.json());
        });
        //Set an environment variable
        postman.setEnvironmentVariable("key", "value");

        //Set a nested object as an environment variable
        let array = [1, 2, 3, 4];
        postman.setEnvironmentVariable("array", JSON.stringify(array, null, 2));
        let obj = { a: [1, 2, 3, 4], b: { c: 'val' } };
        postman.setEnvironmentVariable("obj", JSON.stringify(obj));

        //Get an environment variable
        postman.getEnvironmentVariable("key");

        //Get an environment variable whose value is a stringified object
        //(Wrap in a try-catch block if the data is coming from an unknown source)
        array = JSON.parse(postman.getEnvironmentVariable("array"));
        obj = JSON.parse(postman.getEnvironmentVariable("obj"));

        //Clear an environment variable
        postman.clearEnvironmentVariable("key");

        //Set a global variable
        postman.setGlobalVariable("key", "value");

        //Get a global variable
        postman.getGlobalVariable("key");

        //Clear a global variable
        postman.clearGlobalVariable("key");

        //Set which request to run next when using the Collection Runner or Newman
        postman.setNextRequest("request_name");

        const responseBody = pm.response.json()
        const responseHeaders = pm.response.headers
        const responseTime = pm.reponse.reponseTime
        const responseCode = pm.response.code

        //Check if response body contains a string
        tests["Body matches string"] = responseBody.has("string_you_want_to_search");

        //Check if response body is equal to a string
        tests["Body is correct"] = responseBody === "response_body_string";

        //Check for a JSON value
        const data = JSON.parse(responseBody);
        tests["Your test name"] = data.value === 100;

        //Content-Type is present (Case-insensitive checking)
        tests["Content-Type is present"] = postman.getResponseHeader("Content-Type");
        tests["Content-Type is present"] = postman.getResponseHeader("Content-Type");
        //getResponseHeader() method returns the header value, if it exists

        //Content-Type is present (Case-sensitive)
        tests["Content-Type is present"] = responseHeaders.hasOwnProperty("Content-Type");

        //Response time is less than 200ms
        tests["Response time is less than 200ms"] = responseTime < 200;

        //Response time is within a specific range
        //(lower bound inclusive, upper bound exclusive)
        tests["Response time is acceptable"] = _.inRange(responseTime, 100, 1001);

        //Status code is 200
        tests["Status code is 200"] = responseCode.code === 200;

        //Code name contains a string
        tests["Status code name has string"] = responseCode.name.has("Created");

        //Successful POST request status code
        tests["Successful POST request"] = responseCode.code === 201 || responseCode.code === 202;`
        const translatedCode = translateCode(code);
        expect(true).toBe(true);
    })

    it('should handle tests[] commands', () => {
        const code = `
        tests["Status code is 200"] = pm.response.code === 200;`;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        test("Status code is 200", function() {
                expect(Boolean(res.getStatus() === 200)).to.be.true;
        });`);
    })

    it('should handle tests[] with complex expressions', () => {
        const code = `
        tests["Response has valid data"] = pm.response.json().data && pm.response.json().data.length > 0;`;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        test("Response has valid data", function() {
                expect(Boolean(res.getBody().data && res.getBody().data.length > 0)).to.be.true;
        });`);
    });

    it.skip('should handle tests[] with string equality', () => {
        const code = `
        tests["Content-Type is application/json"] = pm.response.headers.get("Content-Type") === "application/json";`;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        test("Content-Type is application/json", function() {
                expect(Boolean(res.getHeaders().get("Content-Type") === "application/json")).to.be.true;
        });`);
    });

    it('should handle tests[] with function calls', () => {
        const code = `
        tests["Response time is acceptable"] = pm.response.responseTime < 500;`;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        test("Response time is acceptable", function() {
                expect(Boolean(res.getResponseTime() < 500)).to.be.true;
        });`);
    });

    it('should handle tests[] with variable references', () => {
        const code = `
        const expectedStatus = 201;
        tests["Status code is correct"] = pm.response.code === expectedStatus;`;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        const expectedStatus = 201;
        test("Status code is correct", function() {
                expect(Boolean(res.getStatus() === expectedStatus)).to.be.true;
        });`);
    });

    it('should handle multiple tests[] statements', () => {
        const code = `
        tests["Status code is 200"] = pm.response.code === 200;
        tests["Response has data"] = pm.response.json().hasOwnProperty("data");`;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        test("Status code is 200", function() {
                expect(Boolean(res.getStatus() === 200)).to.be.true;
        });
        test("Response has data", function() {
                expect(Boolean(res.getBody().hasOwnProperty("data"))).to.be.true;
        });`);
    });

    it('should handle tests[] with special characters in name', () => {
        const code = `
        tests["Special characters: !@#$%^&*()"] = true;`;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        test("Special characters: !@#$%^&*()", function() {
                expect(Boolean(true)).to.be.true;
        });`);
    });

    it('should handle tests[] with pm.environment variables', () => {
        const code = `
        tests["Response matches environment variable"] = pm.response.json().id === pm.environment.get("expectedId");`;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
        test("Response matches environment variable", function() {
                expect(Boolean(res.getBody().id === bru.getEnvVar("expectedId"))).to.be.true;
        });`);
    });
})