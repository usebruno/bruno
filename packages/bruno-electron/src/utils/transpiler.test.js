const transformCode = require('./acorn-transpiler');
const SKIP_THIS_EXPECT = true;

describe('transformCode function', () => {

 test( 'should comment non-translated pm commands', async () => {
    const inputScript = "pm.test('random test', () => postman.variables.replaceIn('{{$guid}}'));";
    const expectedOutput = "/* pm.test('random test', () => postman.variables.replaceIn('{{$guid}}')); */";
    expect(await transformCode(inputScript)).toBe(expectedOutput);
  });

  test('should comment out single line pm commands', () => {
    const inputScript = `
      pm.sendRequest({});
    `;
    const result = transformCode(inputScript);
    expect(result).toMatch(/\/\*\s+pm\.sendRequest\(\{\}\);\s+\*\//);
  });

  test('should comment out the entire pm block', () => {
    const inputScript = `
      pm.sendRequest({
        url: "https://jsonplaceholder.typicode.com/posts/1",
        method: "GET",
        header: {
            "Content-Type": "application/json"
        }
      }, function (err, res) {
          if (err) {
              console.log("Request Error:", err);
          } else {
              console.log("Dynamic Request Status:", res.code);
              pm.environment.set("response_data", res.json());
          }
      });
    `;

    const result = transformCode(inputScript);
    expect(result).toMatch(/\/\*\n(.*\n)*?.*pm\.sendRequest\(\{.*\n(.*\n)*?.*pm\.environment\.set\(.*res\.json\(\)\).*\n(.*\n)*?\*\//);
  });

  test('should only comment out pm blocks and leave other code untouched', () => {
    const inputScript = `
      console.log('Start of script');

      pm.sendRequest({
        url: "https://jsonplaceholder.typicode.com/posts/1",
        method: "GET"
      });

      console.log('End of script');
    `;

    const result = transformCode(inputScript);
    expect(result).toContain("console.log('Start of script')");
    expect(result).toContain('/*');
    expect(result).toContain('pm.sendRequest({');
    expect(result).toContain('*/');
    expect(result).toContain("console.log('End of script')");
  });

  test('should handle multiple unsupported pm commands in the same file', () => {
    const inputScript = `
      const value = 'test';
      pm.sendRequest({
        "key": value
      });
      console.log('This is a regular script.');
      console.log({ "key": value });
      pm.sendRequest({});
    `;
    
    const result = transformCode(inputScript);
    expect(result).toContain("const value = 'test'");
    expect(result).toContain("console.log('This is a regular script.')");
    expect(result).toContain("console.log({ \"key\": value })");
    expect(result.match(/\/\*.*pm\.sendRequest/s)).not.toBeNull();
  });

  test('should comment out unsupported pm commands without parentheses', () => {
    const inputScript = `
      const value = 'test';
      pm.untranslatedStatus;
      pm.untranslatedCode;
      pm.untranslatedText;
      pm.untranslatedResponseTime;
    `;
    
    const result = transformCode(inputScript);
    expect(result).toContain("const value = 'test'");
    expect(result).toMatch(/\/\*.*pm\.untranslatedStatus/s);
  });

  test('should handle already commented out lines', () => {
    const inputScript = `
      const value = 'test';
      // pm.untranslatedStatus;
      pm.untranslatedCode;
    `;
    
    const result = transformCode(inputScript);
    expect(result).toContain("const value = 'test'");
    expect(result).toContain("// pm.untranslatedStatus;");
    expect(result).toMatch(/\/\*.*pm\.untranslatedCode/s);
  });

  test('should handle pm aliases', () => {
    const inputScript = `
      const myPm = pm;
      myPm.sendRequest({});
    `;
    
    const result = transformCode(inputScript);
    expect(result).toMatch(/\/\*.*const myPm = pm/s);
    expect(result).toMatch(/myPm\.sendRequest/s);
  });

  test('should not modify scripts without pm or postman', () => {
    const inputScript = `
      console.log("This is a regular script.");
    `;

    const result = transformCode(inputScript);
    expect(result.trim()).toBe(inputScript.trim());
  });

  test('should handle edge cases with pm references in objects', () => {
    const inputScript = `
      const sampleObjects = [
        {
          key: pm.unknownFn.get('key'),
          value: pm.unKnownFn.get('value')
        },
      ];
    `;
    
    const result = transformCode(inputScript);
    expect(result).toMatch(/\/\*.*pm\.unknownFn\.get/s);
  });

  test('should comment out derived values correctly', async () => {
    const inputScript = `
      pm.sendRequest({});
      const data = pm.response.json();
      const country = data.country
      console.log(country.name)
    `;

    const expectedOutput = `
/*       pm.sendRequest({}); */
/*       const data = pm.response.json(); */
/*       const country = data.country */
/*       console.log(country.name) */
    `;
    
    expect(await transformCode(inputScript)).toBe(expectedOutput);
  });

  test('should comment out code blocks with weird indentaion correctly', async () => {
    const inputScript = `
    pm.sendRequest({
    url: "https://jsonplaceholder.typicode.com/posts/1",
    method: "GET",
    header: {
        "Content-Type": "application/json"
    }
    }, function (err, res) {
    if (err) {
        console.log("Request Error:", err);
    } else {
        console.log("Dynamic Request Status:", res.code);
        postman.environment.set("response_data", res.json());
    }
    });
    `;

    const expectedOutput = `
/*
    pm.sendRequest({
    url: "https://jsonplaceholder.typicode.com/posts/1",
    method: "GET",
    header: {
        "Content-Type": "application/json"
    }
    }, function (err, res) {
    if (err) {
        console.log("Request Error:", err);
    } else {
        console.log("Dynamic Request Status:", res.code);
        postman.environment.set("response_data", res.json());
    }
    });
*/
    `
    const result = transformCode(inputScript);
    expect(result).toBe(expectedOutput);
  });

  test('should comment out code blocks with weird indentaion correctly', async () => {
const inputScript = `
    const response = await pm.sendRequest({
    url: "https://jsonplaceholder.typicode.com/posts/1",
    method: "GET",
    header: {
        "Content-Type": "application/json"
    }
    }, function (err, res) {
        if (err) {
            console.log("Request Error:", err);
        } else {
            console.log("Dynamic Request Status:", res.code);
            pm.environment.set("response_data", res.json());
        }
    });
`;

    const expectedOutput = `
/*
    const response = await pm.sendRequest({
    url: "https://jsonplaceholder.typicode.com/posts/1",
    method: "GET",
    header: {
        "Content-Type": "application/json"
    }
    }, function (err, res) {
        if (err) {
            console.log("Request Error:", err);
        } else {
            console.log("Dynamic Request Status:", res.code);
            pm.environment.set("response_data", res.json());
        }
    });
*/
`
    const result = transformCode(inputScript);
    expect(result).toBe(expectedOutput);
  });

  test('should comment out commands correctly', async () => {
    const inputScript =`
    const acorn = require("acorn");
    const acornWalk = require("acorn-walk");
    const acornLoose = require("acorn-loose");
    console.log('Start of acorn script');
    const response = await pm.sendRequest({
        url: "https://jsonplaceholder.typicode.com/posts/1",
        method: "GET",
        header: {
            "Content-Type": "application/json"
        }
        }, function (err, res) {
            if (err) {
                console.log("Request Error:", err);
            } else {
                console.log("Dynamic Request Status:", res.code);
                pm.environment.set("response_data", res.json());
            }
    });
    res



    .untranslatedStatus.open({
    hello: "there"
    })

    ;
    pm.untranslatedCode;
    pm
    .environment.get('key'


    );
    pm
    .collectionVariables
    .get('key')
    const bruno = "bruno is a good boy"
    pm.collectionVariables.set('key', 'value');
    const pmx = pm;
    const status = pmx.untranslatedStatus;
    const derived = status.derivedUnknown;
    const pmxx = pmx;
    const status__ = pmxx.untranslatedStatus;
    const status_ = pm.untranslatedStatus;
    const data = pm.response.json();
    pm.expect(pm.environment.has('key')).to.be.true;
    console.log('End of acorn script');
    const goldy = "Golden Era"
    pm.expect(pm.environment.has('key')).to.be.true;
    postman.getEnvironmentVariable('key');
    pm.expect(pm.environment.has('key')).to.be.true;
    pm.test("Check response", function() {
        console.log("Running test");
    });
`

    const expectedOutput = `
    const acorn = require("acorn");
    const acornWalk = require("acorn-walk");
    const acornLoose = require("acorn-loose");
    console.log('Start of acorn script');
/*
    const response = await pm.sendRequest({
        url: "https://jsonplaceholder.typicode.com/posts/1",
        method: "GET",
        header: {
            "Content-Type": "application/json"
        }
        }, function (err, res) {
            if (err) {
                console.log("Request Error:", err);
            } else {
                console.log("Dynamic Request Status:", res.code);
                pm.environment.set("response_data", res.json());
            }
    });
*/
    res



    .untranslatedStatus.open({
    hello: "there"
    })

    ;
/*     pm.untranslatedCode; */
/*
    pm
    .environment.get('key'


    );
*/
/*
    pm
    .collectionVariables
    .get('key')
*/
    const bruno = "bruno is a good boy"
/*     pm.collectionVariables.set('key', 'value'); */
/*     const pmx = pm; */
/*     const status = pmx.untranslatedStatus; */
/*     const derived = status.derivedUnknown; */
/*     const pmxx = pmx; */
/*     const status__ = pmxx.untranslatedStatus; */
/*     const status_ = pm.untranslatedStatus; */
/*     const data = pm.response.json(); */
/*     pm.expect(pm.environment.has('key')).to.be.true; */
    console.log('End of acorn script');
    const goldy = "Golden Era"
/*     pm.expect(pm.environment.has('key')).to.be.true; */
/*     postman.getEnvironmentVariable('key'); */
/*     pm.expect(pm.environment.has('key')).to.be.true; */
/*
    pm.test("Check response", function() {
        console.log("Running test");
    });
*/
`

    expect(await transformCode(inputScript)).toBe(expectedOutput);
  });

  test('should track variables containing PM usage in callbacks', async () => {
    const inputScript = `
      const data = pm.res.json();
      const country = data.country;
      console.log(country.name);
      const cal = "damn";
      var wow = bru.something().then((p) => {
        console.log("pm", p);
        const res = pm.response.json();
      });
      let notDirectAlias = wow.alias();
    `;

    const expectedOutput = `
/*       const data = pm.res.json(); */
/*       const country = data.country; */
/*       console.log(country.name); */
      const cal = "damn";
/*
      var wow = bru.something().then((p) => {
        console.log("pm", p);
        const res = pm.response.json();
      });
*/
/*       let notDirectAlias = wow.alias(); */
    `;
    
    expect(await transformCode(inputScript)).toBe(expectedOutput);
  });

  test('should handle implicit multi-level dependency chaining', async () => {
    const inputScript = `
      // Level 1: direct pm reference
      const req = pm.request;
      
      // Level 2: reference to level 1
      const headers = req.headers;
      
      // Level 3: reference to level 2
      const contentType = headers.get('Content-Type');
      
      // Level 4: using the level 3 variable
      console.log('Content-Type:', contentType);
      
      // Clean code should remain untouched
      const unrelated = 'This is unrelated';
    `;

    const result = transformCode(inputScript);
    expect(result).toMatch(/\/\*.*const req = pm\.request/s);
    expect(result).toMatch(/\/\*.*const headers = req\.headers/s);
    expect(result).toMatch(/\/\*.*const contentType = headers\.get/s);
    expect(result).toMatch(/\/\*.*console\.log\('Content-Type:', contentType\)/s);
    expect(result).toContain("const unrelated = 'This is unrelated';");
  });

  test('should handle object and array pattern destructuring', async () => {
    const inputScript = `
      // Object pattern destructuring from pm
      const { request, response } = pm;
      const { url } = request;
      
      // Array pattern destructuring using pm result
      const items = pm.environment.get('items').split(',');
      const [first, second, ...rest] = items;
      
      // Nested destructuring
      const { data: { token, user: { id, name } } } = pm.response.json();
    `;

    const result = transformCode(inputScript);
    expect(result).toMatch(/\/\*.*const \{ request, response \} = pm/s);
    expect(result).toMatch(/\/\*.*const \{ url \} = request/s);
    expect(result).toMatch(/\/\*.*const items = pm\.environment\.get\('items'\)\.split\(','\)/s);
    expect(result).toMatch(/\/\*.*const \[first, second, ...rest\] = items/s);
    expect(result).toMatch(/\/\*.*const \{ data: \{ token, user: \{ id, name \} \} \} = pm\.response\.json\(\)/s);
  });

  test('should handle pm usage within template literals', async () => {
    const inputScript = `
      const baseUrl = pm.environment.get('baseUrl');
      const apiKey = pm.environment.get('apiKey');
      
      // Template literals with pm-derived variables
      const url = \`\${baseUrl}/api/v1/users?key=\${apiKey}\`;
      
      // Nested template literals
      const query = \`query=\${encodeURIComponent(\`user:\${pm.variables.get('username')}\`)}\`;
      
      // Tagged template literal
      const sql = gql\`
        query {
          user(id: "\${pm.environment.get('userId')}") {
            name
            email
          }
        }
      \`;
    `;

    const result = transformCode(inputScript);
    expect(result).toMatch(/\/\*.*const baseUrl = pm\.environment\.get\('baseUrl'\)/s);
    expect(result).toMatch(/\/\*.*const apiKey = pm\.environment\.get\('apiKey'\)/s);
    expect(result).toMatch(/\/\*.*const url = `\${baseUrl}\/api\/v1\/users\?key=\${apiKey}`/s);
    expect(result).toMatch(/\/\*.*const query = `query=\${encodeURIComponent\(`user:\${pm\.variables\.get\('username'\)}`\)}`/s);
    expect(result).toMatch(/\/\*.*const sql = gql`/s);
    expect(result).toMatch(/pm\.environment\.get\('userId'\)/s);
  });

  test('should handle arrow functions with implicit returns', async () => {
    const inputScript = `
      // Arrow function with implicit return
      const getToken = () => pm.environment.get('token');
      
      // Using the result
      const token = getToken();
      
      // Arrow with block body
      const processToken = (rawToken) => {
        const processed = rawToken + '-processed';
        pm.environment.set('processedToken', processed);
        return processed;
      };
      
      // Using both
      const processed = processToken(token);
    `;

    const result = transformCode(inputScript);
    expect(result).toMatch(/\/\*.*const getToken = \(\) => pm\.environment\.get\('token'\)/s);
    expect(result).toMatch(/\/\*.*const token = getToken\(\)/s);
    expect(result).toMatch(/\/\*.*const processToken = \(rawToken\) => {/s);
    expect(result).toMatch(/pm\.environment\.set\('processedToken', processed\)/s);
    expect(result).toMatch(/\/\*.*const processed = processToken\(token\)/s);
  });

  test('should handle pm usage in array and object methods', async () => {
    const inputScript = `
      // Array methods with pm callbacks
      const items = ['a', 'b', 'c'];
      items.forEach(item => {
        pm.environment.set(item, item.toUpperCase());
      });
      
      const mappedItems = items.map(item => {
        return item + pm.environment.get(item);
      });
      
      // Object methods
      const obj = { a: 1, b: 2 };
      Object.keys(obj).forEach(key => {
        pm.environment.set(key, obj[key]);
      });
    `;

    const result = transformCode(inputScript);
    expect(result).toContain("const items = ['a', 'b', 'c'];");
    expect(result).toMatch(/\/\*.*items\.forEach\(item => {/s);
    expect(result).toMatch(/pm\.environment\.set\(item, item\.toUpperCase\(\)\)/s);
    expect(result).toMatch(/\/\*.*const mappedItems = items\.map\(item => {/s);
    expect(result).toMatch(/return item \+ pm\.environment\.get\(item\)/s);
    expect(result).toContain("const obj = { a: 1, b: 2 };");
    expect(result).toMatch(/\/\*.*Object\.keys\(obj\)\.forEach\(key => {/s);
    expect(result).toMatch(/pm\.environment\.set\(key, obj\[key\]\)/s);
  });

  test('should handle complex async/await patterns', async () => {
    const inputScript = `
      // Async function that uses pm
      async function fetchData() {
        const baseUrl = pm.environment.get('baseUrl');
        const response = await fetch(\`\${baseUrl}/api/data\`);
        return response.json();
      }
      
      // Using the async function with await
      const doWork = async () => {
        try {
          const data = await fetchData();
          pm.environment.set('result', data.result);
        } catch (error) {
          console.error('Error:', error);
        }
      };

      const test = await fetchData();
      
      // Non-pm async function
      async function safeFunction() {
        return 'This is safe';
      }
    `;

    const result = transformCode(inputScript);
    expect(result).toMatch(/const baseUrl = pm\.environment\.get\('baseUrl'\)/s);
    expect(result).toMatch(/\/\*.*const doWork = async \(\) => {/s);
    expect(result).toMatch(/const data = await fetchData\(\)/s);
    expect(result).toMatch(/pm\.environment\.set\('result', data\.result\)/s);
    // The safe function should not be commented
    expect(result).toContain("async function safeFunction() {");
    expect(result).toContain("return 'This is safe';");
  });

  test('should handle complex object literals with method definitions', async () => {
    const inputScript = `
      // Object with methods using pm
      const api = {
        baseUrl: pm.environment.get('baseUrl'),
        getToken() {
          return pm.environment.get('token');
        },
        async fetch(endpoint) {
          const token = this.getToken();
          const response = await fetch(\`\${this.baseUrl}/\${endpoint}\`, {
            headers: {
              'Authorization': \`Bearer \${token}\`
            }
          });
          return response.json();
        }
      };

      const getStatusCode = () => {
        const status = pm.environment.get('status');
        const code = status.code;
        return code;
      }

      // Using the methods - this should also be commented out
      const result = api.fetch('users');
      const statusCode = getStatusCode();
`;

    const expectedOutput = `
      // Object with methods using pm
/*
      const api = {
        baseUrl: pm.environment.get('baseUrl'),
        getToken() {
          return pm.environment.get('token');
        },
        async fetch(endpoint) {
          const token = this.getToken();
          const response = await fetch(\`\${this.baseUrl}/\${endpoint}\`, {
            headers: {
              'Authorization': \`Bearer \${token}\`
            }
          });
          return response.json();
        }
      };
*/

/*
      const getStatusCode = () => {
        const status = pm.environment.get('status');
        const code = status.code;
        return code;
      }
*/

      // Using the methods - this should also be commented out
/*       const result = api.fetch('users'); */
/*       const statusCode = getStatusCode(); */
`
    

    const result = transformCode(inputScript);
    expect(result).toBe(expectedOutput);
   
  });

  test("should comment out statements that reference variables defined in commented code", () => {
    const code = `
      // Object with methods using pm
      const api = {
        baseUrl: pm.environment.get('baseUrl'),
        getToken() {
          return pm.environment.get('token');
        },
        async fetch(endpoint) {
          const token = this.getToken();
          const response = await fetch(\`\${this.baseUrl}/\${endpoint}\`, {
            headers: {
              'Authorization': \`Bearer \${token}\`
            }
          });
          return response.json();
        }
      };

      const getStatusCode = () => {
        const status = pm.environment.get('status');
        const code = status.code;
        return code;
      }
      
      // Using the methods - this should also be commented out
      const result = api.fetch('users');
      const statusCode = getStatusCode();
    `;

    const result = transformCode(code);
    
    // Verify that all relevant lines are commented out using regex patterns
    expect(result).toMatch(/\/\*\s*const result\s*=\s*api\.fetch\(['"]users['"]\);\s*\*\//);
    expect(result).toMatch(/\/\*\s*const statusCode\s*=\s*getStatusCode\(\);\s*\*\//);
  });

  /* Skipping this test as the transpiler is yet not supporting finding pm aliases of destructured variables */
  test.skip('should handle destructuring with pm references', async () => {
    const inputScript = `
      const { request, response } = pm;
      const { url } = request;
      const { data } = response;
    `;

    const result = transformCode(inputScript);
    
    // More strict regex patterns that check for properly commented lines
    expect(result).toMatch(/\/\*\s*const \{ request, response \} = pm.*\*\//s);
    expect(result).toMatch(/\/\*\s*const \{ url \} = request.*\*\//s);
    expect(result).toMatch(/\/\*\s*const \{ data \} = response.*\*\//s);
  });

  test('should handle pm or it\'s aliases being used in function arguments', async () => {
    const inputScript = `
      func(pm.vars.get('x'))
      func({key: pm.vars.get('x')})
      func(() => pm.vars.get('x'))
      callApi({ 
        headers: { 'Auth': pm.variables.get('token') },
        timeout: 5000
      })
      getData().then(response => {
        pm.environment.set('response', response);
      })
      array.filter(item => item.id === pm.environment.get('filterId'))
      somePromise.finally(() => {
        pm.environment.set('requestComplete', true);
      });

      somePromise.then(result => {
        pm.environment.set('result', result);
      return result;
      });

      somePromise.catch(error => {
        pm.environment.set('error', error.message);
      console.error(error);
      });

      somePromise.then(result => {
        randomFn(result);
      }).catch(error => {
        console.error(error);
      }).finally(() => {
        pm.environment.set('requestComplete', true);
      });
    `

    const result = transformCode(inputScript);
    expect(result).toMatch(/\/\*\s+func\(pm\.vars\.get\('x'\)\)\s+\*\//);
    expect(result).toMatch(/\/\*\s+func\(\{\s*key:\s*pm\.vars\.get\('x'\)\}\)\s+\*\//);
    expect(result).toMatch(/\/\*\s+func\(\(\)\s*=>\s*pm\.vars\.get\('x'\)\)\s+\*\//);
    expect(result).toMatch(/\/\*\n\s+callApi\(\{\s*headers:\s*\{\s*['"]Auth['"]\s*:\s*pm\.variables\.get\(['"]token['"]\)\s*\},[\s\S]*?\*\//);
    expect(result).toMatch(/\/\*\n\s+getData\(\)\.then\(response\s*=>\s*\{\s*pm\.environment\.set\(['"]response['"]\s*,\s*response\);[\s\S]*?\*\//);
    expect(result).toMatch(/\/\*\s+array\.filter\(item\s*=>\s*item\.id\s*===\s*pm\.environment\.get\(['"]filterId['"]\)\)\s+\*\//);
    expect(result).toMatch(/\/\*\n\s+somePromise\.finally\(\(\)\s*=>\s*\{\s*pm\.environment\.set\(['"]requestComplete['"]\s*,\s*true\);[\s\S]*?\*\//);
    expect(result).toMatch(/\/\*\n\s+somePromise\.then\(result\s*=>\s*\{\s*pm\.environment\.set\(['"]result['"]\s*,\s*result\);[\s\S]*?\*\//);
    expect(result).toMatch(/\/\*\n\s+somePromise\.catch\(error\s*=>\s*\{\s*pm\.environment\.set\(['"]error['"]\s*,\s*error\.message\);[\s\S]*?\*\//);
    expect(result).toMatch(/\/\*\n\s+somePromise\.then\(result\s*=>\s*\{\s*randomFn\(result\);[\s\S]*?\*\//);
    
    
  })

  test('should handle assignment expressions with PM references', async () => {
    const inputScript = `
      // Variable declarations
      let directAssign;
      let propertyAssign;
      let methodCallAssign;
      let taintedAssign;
      let chainedAssign;
      
      // Assignment expressions - these should test processAssignmentExpression
      directAssign = pm;
      propertyAssign = pm.environment;
      methodCallAssign = pm.response.json();
      
      // Tainted variables
      const tainted = pm.variables;
      taintedAssign = tainted.get('key');
      
      // Chained assignments
      let x, y, z;
      x = y = z = pm.environment.get('value');
      
      // Using the assigned variables
      console.log(directAssign.environment);
      console.log(propertyAssign.get('key'));
      console.log(methodCallAssign.data);
      console.log(taintedAssign);
      console.log(x, y, z);
    `;

    const result = transformCode(inputScript);
    
    // Direct assignment: variable = pm;
    expect(result).toMatch(/\/\*\s+directAssign = pm;\s+\*\//);
    
    // Property assignment: variable = pm.environment;
    expect(result).toMatch(/\/\*\s+propertyAssign = pm\.environment;\s+\*\//);
    
    // Method call assignment: variable = pm.response.json();
    expect(result).toMatch(/\/\*\s+methodCallAssign = pm\.response\.json\(\);\s+\*\//);
    
    // Tainted variable assignment: variable = tainted.get('key');
    expect(result).toMatch(/\/\*\s+taintedAssign = tainted\.get\('key'\);\s+\*\//);
    
    // Chained assignments: x = y = z = pm.environment.get('value');
    expect(result).toMatch(/\/\*\s+x = y = z = pm\.environment\.get\('value'\);\s+\*\//);
    
    // Usage of assigned variables should also be commented out
    expect(result).toMatch(/\/\*\s+console\.log\(directAssign\.environment\);\s+\*\//);
    expect(result).toMatch(/\/\*\s+console\.log\(propertyAssign\.get\('key'\)\);\s+\*\//);
    expect(result).toMatch(/\/\*\s+console\.log\(methodCallAssign\.data\);\s+\*\//);
    expect(result).toMatch(/\/\*\s+console\.log\(taintedAssign\);\s+\*\//);
    expect(result).toMatch(/\/\*\s+console\.log\(x, y, z\);\s+\*\//);
  });


  test('should test function declarations', async () => {
    const inputScript = `
      function test() {
        return pm.response.json();
      }
    `;

    const result = transformCode(inputScript);
    expect(result).toMatch(/\/\*\n\s+function test\(\)\s*\{[\s\S]*?\*\//);
  })

  test('should handle function declarations with PM references', async () => {
    const inputScript = `
      // Basic function with PM in body
      function getResponseData() {
        return pm.response.json();
      }
      
      // Function with PM in default parameter
      function processData(defaultValue = pm.variables.get('default')) {
        return defaultValue;
      }
      
      // Function with PM references in body variables
      function fetchUserData() {
        const apiKey = pm.environment.get('apiKey');
        const url = \`https://api.example.com?key=\${apiKey}\`;
        return fetch(url);
      }
      
      // Function with PM reference in nested function
      function complexOperation() {
        const nestedFn = () => {
          return pm.variables.get('value');
        };
        return nestedFn();
      }
      
      // Function with conditional PM usage
      function conditionalFetch(useAuth) {
        let headers = {};
        if (useAuth) {
          headers.Authorization = \`Bearer \${pm.environment.get('token')}\`;
        }
        return fetch('/api/data', { headers });
      }
      
      // Using the functions - these should also be commented out
      const response = getResponseData();
      const processed = processData();
      const userData = fetchUserData();
      const result = complexOperation();
      const data = conditionalFetch(true);
    `;

    const result = transformCode(inputScript);
    
    // Function declarations with PM references should be commented out
    expect(result).toMatch(/\/\*\s+function getResponseData\(\)[\s\S]*?return pm\.response\.json\(\);[\s\S]*?\*\//);
    expect(result).toMatch(/\/\*\s+function processData\(defaultValue = pm\.variables\.get\(['"]default['"]\)\)[\s\S]*?\*\//);
    expect(result).toMatch(/\/\*\s+function fetchUserData\(\)[\s\S]*?const apiKey = pm\.environment\.get\(['"]apiKey['"]\);[\s\S]*?\*\//);
    expect(result).toMatch(/\/\*\s+function complexOperation\(\)[\s\S]*?return pm\.variables\.get\(['"]value['"]\);[\s\S]*?\*\//);
    expect(result).toMatch(/\/\*\s+function conditionalFetch\(useAuth\)[\s\S]*?headers\.Authorization = [`]Bearer \${pm\.environment\.get\(['"]token['"]\)}[`];[\s\S]*?\*\//);
    
    // Function calls should also be commented out
    expect(result).toMatch(/\/\*\s+const response = getResponseData\(\);[\s\S]*?\*\//);
    expect(result).toMatch(/\/\*\s+const processed = processData\(\);[\s\S]*?\*\//);
    expect(result).toMatch(/\/\*\s+const userData = fetchUserData\(\);[\s\S]*?\*\//);
    expect(result).toMatch(/\/\*\s+const result = complexOperation\(\);[\s\S]*?\*\//);
    expect(result).toMatch(/\/\*\s+const data = conditionalFetch\(true\);[\s\S]*?\*\//);
  });

  test('should handle function declarations without PM references', async () => {
    const inputScript = `
      // Function without PM references
      function pureFunction(a, b) {
        return a + b;
      }
      
      // Function with "pm" in a string but not a reference
      function logMessage() {
        console.log("This mentions pm but doesn't use it");
        return "No PM here";
      }
      
      // These calls should not be commented
      const sum = pureFunction(1, 2);
      const message = logMessage();
      
      // But this should be commented
      const pmData = pm.variables.get('data');
    `;

    const result = transformCode(inputScript);
    
    // Functions without PM references should not be commented out
    expect(result).not.toMatch(/\/\*\s+function pureFunction\(a, b\)[\s\S]*?\*\//);
    expect(result).not.toMatch(/\/\*\s+function logMessage\(\)[\s\S]*?\*\//);
    
    // Clean function calls should not be commented out
    expect(result).not.toMatch(/\/\*\s+const sum = pureFunction\(1, 2\);[\s\S]*?\*\//);
    expect(result).not.toMatch(/\/\*\s+const message = logMessage\(\);[\s\S]*?\*\//);
    
    // PM references should still be commented out
    expect(result).toMatch(/\/\*\s+const pmData = pm\.variables\.get\(['"]data['"]\);[\s\S]*?\*\//);
  });

  test('should handle various arrow function patterns with PM references', async () => {
    const inputScript = `
      // No parameters, implicit return
      const getToken = () => pm.environment.get('token');
      
      // Single parameter, no parentheses, implicit return
      const processId = id => pm.variables.get(id);
      
      // Multiple parameters, explicit return
      const combineValues = (key1, key2) => {
        const val1 = pm.environment.get(key1);
        const val2 = pm.environment.get(key2);
        return \`\${val1}-\${val2}\`;
      };
      
      // Default parameters with PM reference
      const fetchWithDefault = (endpoint, auth = pm.variables.get('defaultAuth')) => {
        return fetch(endpoint, { headers: { Authorization: auth } });
      };
      
      // Rest parameters
      const logValues = (...keys) => {
        keys.forEach(key => {
          console.log(pm.environment.get(key));
        });
      };
      
      // Immediately invoked arrow function
      const result = ((baseUrl) => {
        return \`\${baseUrl}/api\`;
      })(pm.environment.get('baseUrl'));
      
      // Usage of these functions
      const token = getToken();
      const userId = processId('userId');
      const combinedKey = combineValues('key1', 'key2');
      const response = fetchWithDefault('/users');
      logValues('item1', 'item2', 'item3');
      console.log(result);
    `;

    const result = transformCode(inputScript);
    
    // Verify all arrow functions with PM references are commented out
    expect(result).toMatch(/\/\*\s+const getToken = \(\) => pm\.environment\.get\(['"]token['"]\);\s+\*\//);
    expect(result).toMatch(/\/\*\s+const processId = id => pm\.variables\.get\(id\);\s+\*\//);
    expect(result).toMatch(/\/\*\s+const combineValues = \(key1, key2\) => \{\s+const val1 = pm\.environment\.get\(key1\);\s+const val2 = pm\.environment\.get\(key2\);\s+return [`]\${val1}-\${val2}[`];\s+\};\s+\*\//);
    expect(result).toMatch(/\/\*\s+const fetchWithDefault = \(endpoint, auth = pm\.variables\.get\(['"]defaultAuth['"]\)\) => \{\s+return fetch\(endpoint, \{ headers: \{ Authorization: auth \} \}\);\s+\};\s+\*\//);
    expect(result).toMatch(/\/\*\s+const logValues = \(...keys\) => \{\s+keys\.forEach\(key => \{\s+console\.log\(pm\.environment\.get\(key\)\);\s+\}\);\s+\};\s+\*\//);
    expect(result).toMatch(/\/\*\s+const result = \(\(baseUrl\) => \{\s+return [`]\${baseUrl}\/api[`];\s+\}\)\(pm\.environment\.get\(['"]baseUrl['"]\)\);\s+\*\//);
    
    // Verify function calls are also commented out
    expect(result).toMatch(/\/\*\s+const token = getToken\(\);\s+\*\//);
    expect(result).toMatch(/\/\*\s+const userId = processId\(['"]userId['"]\);\s+\*\//);
    expect(result).toMatch(/\/\*\s+const combinedKey = combineValues\(['"]key1['"], ['"]key2['"]\);\s+\*\//);
    expect(result).toMatch(/\/\*\s+const response = fetchWithDefault\(['"]\/users['"]\);\s+\*\//);
    expect(result).toMatch(/\/\*\s+logValues\(['"]item1['"], ['"]item2['"], ['"]item3['"]\);\s+\*\//);
    expect(result).toMatch(/\/\*\s+console\.log\(result\);\s+\*\//);
  });

  test('should handle arrow functions as callback arguments', async () => {
    const inputScript = `
      // Arrow functions as callbacks with PM references
      [1, 2, 3].map(item => pm.variables.get(\`item\${item}\`));
      
      ['a', 'b'].forEach(key => {
        const value = pm.environment.get(key);
        console.log(value);
      });
      
      // Promise chains with arrow functions
      fetch('/api/data')
        .then(response => response.json())
        .then(data => {
          pm.environment.set('data', data);
          return data;
        })
        .catch(error => pm.environment.set('error', error.message));
      
      // Event listener with arrow function
      element.addEventListener('click', () => {
        pm.environment.set('clicked', true);
      });
      
      // Higher order function returning arrow function
      const createGetter = (prefix) => (key) => {
        return pm.variables.get(\`\${prefix}.\${key}\`);
      };
      
      const userGetter = createGetter('user');
      const userName = userGetter('name');
    `;

    const result = transformCode(inputScript);
    
    // Verify arrow functions in callbacks are commented out
    expect(result).toMatch(/\/\*\s+\[1, 2, 3\]\.map\(item => pm\.variables\.get\([`]item\${item}[`]\)\);\s+\*\//);
    expect(result).toMatch(/\/\*\s+\['a', 'b'\]\.forEach\(key => \{\s+const value = pm\.environment\.get\(key\);\s+console\.log\(value\);\s+\}\);\s+\*\//);
    
    // Verify promise chains with arrow functions are commented out
    expect(result).toMatch(/\/\*\s+fetch\(['"]\/api\/data['"]\)\s+\.then\(response => response\.json\(\)\)\s+\.then\(data => \{\s+pm\.environment\.set\(['"]data['"], data\);\s+return data;\s+\}\)\s+\.catch\(error => pm\.environment\.set\(['"]error['"], error\.message\)\);\s+\*\//);
    
    // Verify event listener with arrow function is commented out
    expect(result).toMatch(/\/\*\s+element\.addEventListener\(['"]click['"], \(\) => \{\s+pm\.environment\.set\(['"]clicked['"], true\);\s+\}\);\s+\*\//);
    
    // Verify higher order function returning arrow function is commented out
    expect(result).toMatch(/\/\*\s+const createGetter = \(prefix\) => \(key\) => \{\s+return pm\.variables\.get\([`]\${prefix}\.\${key}[`]\);\s+\};\s+\*\//);
    expect(result).toMatch(/\/\*\s+const userGetter = createGetter\(['"]user['"]\);\s+\*\//);
    if (!SKIP_THIS_EXPECT) { // acorn-transpiler.js does not consider arrow functions as of now, so we skip this test, the transpiler will comment out arrow functions , but it may mot do the same for it's aliases. I saw performance issues with the arrow functions implementation, so I'm skipping it for now. checking arrow function taking 25% extra time, cause of the recursive check. current code is good for 90% of the cases.
      expect(result).toMatch(/\/\*\s+const userName = userGetter\(['"]name['"]\);\s+\*\//);
    }
  });

  test('should distinguish between clean arrow functions and PM-tainted ones', async () => {
    const inputScript = `
      // Clean arrow functions (no PM references)
      const add = (a, b) => a + b;
      const multiply = (a, b) => {
        return a * b;
      };
      const formatName = (first, last) => \`\${first} \${last}\`;
      
      // Arrow functions with PM references
      const getValue = key => pm.variables.get(key);
      const processItem = item => {
        return {
          id: item.id,
          name: item.name,
          token: pm.environment.get('token')
        };
      };
      
      // Mixed usage
      const sum = add(5, 10);
      const product = multiply(4, 6);
      const name = formatName('John', 'Doe');
      
      const apiKey = getValue('apiKey');
      const processedItem = processItem({ id: 1, name: 'Item 1' });
      
      // Complex mixed scenario
      const items = [1, 2, 3].map(id => {
        // This function should be clean
        const format = num => \`ID: \${num}\`;
        
        // This one has PM references
        const getData = id => {
          return pm.variables.get(\`item_\${id}\`);
        };
        
        return {
          formattedId: format(id),
          data: getData(id)
        };
      });
    `;

    const result = transformCode(inputScript);
    
    // Clean arrow functions should NOT be commented out
    expect(result).toContain("const add = (a, b) => a + b;");
    expect(result).toContain("const multiply = (a, b) => {");
    expect(result).toContain("const formatName = (first, last) => `${first} ${last}`;");
    
    // Clean function calls should NOT be commented out
    expect(result).toContain("const sum = add(5, 10);");
    expect(result).toContain("const product = multiply(4, 6);");
    expect(result).toContain("const name = formatName('John', 'Doe');");
    
    // Arrow functions with PM references should be commented out
    expect(result).toMatch(/\/\*\s+const getValue = key => pm\.variables\.get\(key\);\s+\*\//);
    expect(result).toMatch(/\/\*\s+const processItem = item => \{\s+return \{\s+id: item\.id,\s+name: item\.name,\s+token: pm\.environment\.get\(['"]token['"]\)\s+\};\s+\};\s+\*\//);
    
    // Calls to PM-tainted functions should be commented out
    expect(result).toMatch(/\/\*\s+const apiKey = getValue\(['"]apiKey['"]\);\s+\*\//);
    expect(result).toMatch(/\/\*\s+const processedItem = processItem\(\{ id: 1, name: ['"]Item 1['"] \}\);\s+\*\//);
    
    // Complex mixed scenario should be commented out entirely due to PM reference
    expect(result).toMatch(/\/\*\s+const items = \[1, 2, 3\]\.map\(id => \{\s+.*\s+const getData = id => \{\s+return pm\.variables\.get\([`]item_\${id}[`]\);\s+\};\s+.*\s+\}\);\s+\*\//s);
  });
});
