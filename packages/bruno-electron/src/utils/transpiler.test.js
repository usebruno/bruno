const transformCode = require('./acorn-transpiler');

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
    expect(result).toContain('/*');
    expect(result).toContain('*/');
    expect(result).toContain('pm.sendRequest({})');
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
    expect(result).toContain('/*');
    expect(result).toContain('*/');
    expect(result).toContain('pm.sendRequest({');
    expect(result).toContain('pm.environment.set("response_data", res.json())');
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
});
