import translateBruToPostman from '../../../src/utils/bruno-to-postman-translator';

describe('Bruno to Postman Send Request Translation', () => {
  describe('Raw Body Mode', () => {
    it('should transform raw JSON body to Postman format', () => {
      const code = `
        bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            data: JSON.stringify({
                "x": 1
            })
        }, function (error, response) {
            if (error) {
                const errorCode = error.code;
                console.log(errorCode);
            }
            if (response) {
                const response_body = response.data;
                const response_headers = response.headers;
                console.log(response_body, response_headers);
            }
        });
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: {
                mode: "raw",

                raw: JSON.stringify({
                    "x": 1
                })
            }
        }, function(error, response) {
            if (error) {
                const errorCode = error.code;
                console.log(errorCode);
            }
            if (response) {
                const response_body = response.json();
                const response_headers = response.headers;
                console.log(response_body, response_headers);
            }
        });
      `);
    });

    it('should transform raw text body', () => {
      const code = `
        bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            data: 'Hello World'
        }, function (error, response) {
            console.log(response.data);
        });
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {
                'Content-Type': 'text/plain',
            },
            body: {
                mode: "raw",
                raw: 'Hello World'
            }
        }, function(error, response) {
            console.log(response.json());
        });
      `);
    });

    it('should transform raw JSON object body', () => {
      const code = `
        bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            data: {
                "x": 1
            }
        }, function (error, response) {
            if (error) {
                const errorCode = error.code;
                console.log(errorCode);
            }
            if (response) {
                const response_body = response.data;
                const response_headers = response.headers;
                console.log(response_body, response_headers);
            }
        });
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: {
                mode: "raw",

                raw: {
                    "x": 1
                }
            }
        }, function(error, response) {
            if (error) {
                const errorCode = error.code;
                console.log(errorCode);
            }
            if (response) {
                const response_body = response.json();
                const response_headers = response.headers;
                console.log(response_body, response_headers);
            }
        });
      `);
    });

    it('should transform raw body with spread operator (preserved as-is)', () => {
      const code = `
        const additionalData = { "y": 2, "z": 3 };
        bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            data: {
                "x": 1,
                ...additionalData
            }
        });
      `;
      const translatedCode = translateBruToPostman(code);
      // In raw mode, spread operators are preserved as-is in the object
      expect(translatedCode).toBe(`
        const additionalData = { "y": 2, "z": 3 };
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {
                'Content-Type': 'application/json',
            },
            body: {
                mode: "raw",

                raw: {
                    "x": 1,
                    ...additionalData
                }
            }
        });
      `);
    });
  });

  describe('URL-encoded Body Mode', () => {
    it('should transform urlencoded body with single key-value pair', () => {
      const code = `
        bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            data: {
                "key": "value"
            }
        }, function (error, response) {
            if (response) {
                const response_body = response.data;
                console.log(response_body);
            }
        });
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: {
                mode: "urlencoded",

                urlencoded: [{
                    key: "key",
                    value: "value"
                }]
            }
        }, function(error, response) {
            if (response) {
                const response_body = response.json();
                console.log(response_body);
            }
        });
      `);
    });

    it('should transform urlencoded body with multiple key-value pairs', () => {
      const code = `
        bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            data: {
                "firstName": "John",
                "lastName": "Doe",
                "email": "john.doe@example.com"
            }
        }, function (error, response) {
            console.log(response.data);
        });
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: {
                mode: "urlencoded",

                urlencoded: [{
                    key: "firstName",
                    value: "John"
                }, {
                    key: "lastName",
                    value: "Doe"
                }, {
                    key: "email",
                    value: "john.doe@example.com"
                }]
            }
        }, function(error, response) {
            console.log(response.json());
        });
      `);
    });

    it('should transform urlencoded body when no Content-Type header exists', () => {
      const code = `
        bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            data: {
                "key1": "value1",
                "key2": "value2"
            }
        });
      `;
      const translatedCode = translateBruToPostman(code);
      // Without Content-Type header, defaults to raw mode
      expect(translatedCode).toBe(`
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            body: {
                mode: "raw",

                raw: {
                    "key1": "value1",
                    "key2": "value2"
                }
            }
        });
      `);
    });

    it('should transform urlencoded body with incorrect Content-Type header', () => {
      const code = `
        bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            data: {
                "key1": "value1",
                "key2": "value2"
            }
        });
      `;
      const translatedCode = translateBruToPostman(code);
      // With text/plain Content-Type, defaults to raw mode
      expect(translatedCode).toBe(`
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {
                'Content-Type': 'text/plain',
            },
            body: {
                mode: "raw",

                raw: {
                    "key1": "value1",
                    "key2": "value2"
                }
            }
        });
      `);
    });

    it('should transform urlencoded body with spread operator', () => {
      const code = `
        const rest = { "key3": "value3", "key4": "value4" };
        bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            data: {
                "key1": "value1",
                "key2": "value2",
                ...rest
            }
        });
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        const rest = { "key3": "value3", "key4": "value4" };
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: {
                mode: "urlencoded",

                urlencoded: [{
                    key: "key1",
                    value: "value1"
                }, {
                    key: "key2",
                    value: "value2"
                }, ...Object.entries(rest).map(([key, value]) => ({
                    key: key,
                    value: value
                }))]
            }
        });
      `);
    });

    it('should transform urlencoded body with only spread operator', () => {
      const code = `
        const rest = { "key1": "value1", "key2": "value2" };
        bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            data: {
                ...rest
            }
        });
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        const rest = { "key1": "value1", "key2": "value2" };
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: {
                mode: "urlencoded",

                urlencoded: [...Object.entries(rest).map(([key, value]) => ({
                    key: key,
                    value: value
                }))]
            }
        });
      `);
    });

    it('should transform urlencoded body with multiple spread operators', () => {
      const code = `
        const rest1 = { "key1": "value1" };
        const rest2 = { "key2": "value2" };
        bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            data: {
                ...rest1,
                "key3": "value3",
                ...rest2
            }
        });
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        const rest1 = { "key1": "value1" };
        const rest2 = { "key2": "value2" };
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: {
                mode: "urlencoded",

                urlencoded: [...Object.entries(rest1).map(([key, value]) => ({
                    key: key,
                    value: value
                })), {
                    key: "key3",
                    value: "value3"
                }, ...Object.entries(rest2).map(([key, value]) => ({
                    key: key,
                    value: value
                }))]
            }
        });
      `);
    });
  });

  describe('Multi-part Form Data Body Mode', () => {
    it('should transform formdata body with single key-value pair', () => {
      const code = `
        bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            data: {
                "key": "value"
            }
        }, function (error, response) {
            if (response) {
                const response_body = response.data;
                console.log(response_body);
            }
        });
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {
                'Content-Type': 'multipart/form-data',
            },
            body: {
                mode: "formdata",

                formdata: [{
                    key: "key",
                    value: "value"
                }]
            }
        }, function(error, response) {
            if (response) {
                const response_body = response.json();
                console.log(response_body);
            }
        });
      `);
    });

    it('should transform formdata body with multiple key-value pairs', () => {
      const code = `
        bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            data: {
                "firstName": "John",
                "lastName": "Doe",
                "email": "john.doe@example.com"
            }
        }, function (error, response) {
            if (response) {
                const response_body = response.data;
                console.log(response_body);
            }
        });
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {
                'Content-Type': 'multipart/form-data',
            },
            body: {
                mode: "formdata",

                formdata: [{
                    key: "firstName",
                    value: "John"
                }, {
                    key: "lastName",
                    value: "Doe"
                }, {
                    key: "email",
                    value: "john.doe@example.com"
                }]
            }
        }, function(error, response) {
            if (response) {
                const response_body = response.json();
                console.log(response_body);
            }
        });
      `);
    });

    it('should transform formdata body when no Content-Type header exists', () => {
      const code = `
        bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            data: {
                "firstName": "John",
                "lastName": "Doe"
            }
        }, function (error, response) {
            if (response) {
                const response_body = response.data;
                console.log(response_body);
            }
        });
      `;
      const translatedCode = translateBruToPostman(code);
      // Without Content-Type header, defaults to raw mode
      expect(translatedCode).toBe(`
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            body: {
                mode: "raw",

                raw: {
                    "firstName": "John",
                    "lastName": "Doe"
                }
            }
        }, function(error, response) {
            if (response) {
                const response_body = response.json();
                console.log(response_body);
            }
        });
      `);
    });

    it('should transform formdata body with incorrect Content-Type header', () => {
      const code = `
        bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            data: {
                "firstName": "John",
                "lastName": "Doe"
            }
        }, function (error, response) {
            if (response) {
                const response_body = response.data;
                console.log(response_body);
            }
        });
      `;
      const translatedCode = translateBruToPostman(code);
      // With text/plain Content-Type, defaults to raw mode
      expect(translatedCode).toBe(`
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {
                'Content-Type': 'text/plain',
            },
            body: {
                mode: "raw",

                raw: {
                    "firstName": "John",
                    "lastName": "Doe"
                }
            }
        }, function(error, response) {
            if (response) {
                const response_body = response.json();
                console.log(response_body);
            }
        });
      `);
    });

    it('should transform formdata body with spread operator', () => {
      const code = `
        const additionalFields = { "email": "john@example.com", "phone": "123-456-7890" };
        bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            data: {
                "firstName": "John",
                "lastName": "Doe",
                ...additionalFields
            }
        }, function (error, response) {
            if (response) {
                const response_body = response.data;
                console.log(response_body);
            }
        });
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        const additionalFields = { "email": "john@example.com", "phone": "123-456-7890" };
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {
                'Content-Type': 'multipart/form-data',
            },
            body: {
                mode: "formdata",

                formdata: [{
                    key: "firstName",
                    value: "John"
                }, {
                    key: "lastName",
                    value: "Doe"
                }, ...Object.entries(additionalFields).map(([key, value]) => ({
                    key: key,
                    value: value
                }))]
            }
        }, function(error, response) {
            if (response) {
                const response_body = response.json();
                console.log(response_body);
            }
        });
      `);
    });

    it('should transform formdata body with only spread operator', () => {
      const code = `
        const formData = { "name": "John", "age": "30" };
        bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            data: {
                ...formData
            }
        });
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        const formData = { "name": "John", "age": "30" };
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {
                'Content-Type': 'multipart/form-data',
            },
            body: {
                mode: "formdata",

                formdata: [...Object.entries(formData).map(([key, value]) => ({
                    key: key,
                    value: value
                }))]
            }
        });
      `);
    });

    it('should transform formdata body with spread operator using computed property', () => {
      const code = `
        const dynamicKey = "dynamicField";
        const rest = { [dynamicKey]: "dynamicValue", "staticField": "staticValue" };
        bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            data: {
                "key1": "value1",
                ...rest
            }
        });
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        const dynamicKey = "dynamicField";
        const rest = { [dynamicKey]: "dynamicValue", "staticField": "staticValue" };
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {
                'Content-Type': 'multipart/form-data',
            },
            body: {
                mode: "formdata",

                formdata: [{
                    key: "key1",
                    value: "value1"
                }, ...Object.entries(rest).map(([key, value]) => ({
                    key: key,
                    value: value
                }))]
            }
        });
      `);
    });
  });

  describe('Headers Handling', () => {
    it('should rename headers property to header', () => {
      const code = `
        bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'GET',
            headers: {
                'X-Custom-Header': 'custom-value',
                'Authorization': 'Bearer token'
            }
        });
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'GET',
            header: {
                'X-Custom-Header': 'custom-value',
                'Authorization': 'Bearer token'
            }
        });
      `);
    });
  });

  describe('Response Handling', () => {
    it('should transform response property access', () => {
      const code = `
        bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'GET'
        }, function (error, response) {
            const status = response.status;
            const statusText = response.statusText;
            const headers = response.headers;
            const body = response.data;

            if (status === 200) {
                console.log('Success!');
            }
        });
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'GET'
        }, function(error, response) {
            const status = response.code;
            const statusText = response.status;
            const headers = response.headers;
            const body = response.json();

            if (status === 200) {
                console.log('Success!');
            }
        });
      `);
    });
  });

  describe('Callback Handling', () => {
    it('should transform callback function', () => {
      const code = `
        bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'GET'
        }, function (error, response) {
            console.log(response.data);
        });
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'GET'
        }, function(error, response) {
            console.log(response.json());
        });
      `);
    });

    it('should handle arrow function callbacks', () => {
      const code = `
        bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'GET'
        }, (error, response) => {
            console.log(response.data);
        });
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'GET'
        }, function(error, response) {
            console.log(response.json());
        });
      `);
    });

    it('should handle async arrow function callbacks', () => {
      const code = `
        bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'GET'
        }, async (error, response) => {
            await new Promise(resolve => {
                setTimeout(() => {
                    resolve();
                }, 1000)
            });
            console.log(response.data);
        });
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'GET'
        }, async function(error, response) {
            await new Promise(resolve => {
                setTimeout(() => {
                    resolve();
                }, 1000)
            });
            console.log(response.json());
        });
      `);
    });
  });

  describe('Request Config Variables', () => {
    it('should transform requestConfig passed as a variable', () => {
      const code = `
        const requestConfig = {
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            data: JSON.stringify({
                "x": 1
            })
        };
        bru.sendRequest(requestConfig, function (error, response) {
            if (response) {
                const response_body = response.data;
                console.log(response_body);
            }
        });
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        const requestConfig = {
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: {
                mode: "raw",

                raw: JSON.stringify({
                    "x": 1
                })
            }
        };
        pm.sendRequest(requestConfig, function(error, response) {
            if (response) {
                const response_body = response.json();
                console.log(response_body);
            }
        });
      `);
    });

    it('should transform requestConfig with multi-level variable references', () => {
      const code = `
        const requestConfig = {
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            data: { "x": 1 }
        };
        const requestConfig1 = requestConfig;
        const requestConfig2 = requestConfig1;
        bru.sendRequest(requestConfig2, function (error, response) {
            console.log(response.data);
        });
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        const requestConfig = {
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {
                'Content-Type': 'application/json',
            },
            body: {
                mode: "raw",
                raw: { "x": 1 }
            }
        };
        const requestConfig1 = requestConfig;
        const requestConfig2 = requestConfig1;
        pm.sendRequest(requestConfig2, function(error, response) {
            console.log(response.json());
        });
      `);
    });

    it('should transform urlencoded body mode with variable config', () => {
      const code = `
        const requestConfig = {
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            data: {
                "firstName": "John",
                "lastName": "Doe"
            }
        };
        bru.sendRequest(requestConfig, function (error, response) {
            console.log(response.data);
        });
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        const requestConfig = {
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: {
                mode: "urlencoded",

                urlencoded: [{
                    key: "firstName",
                    value: "John"
                }, {
                    key: "lastName",
                    value: "Doe"
                }]
            }
        };
        pm.sendRequest(requestConfig, function(error, response) {
            console.log(response.json());
        });
      `);
    });

    it('should transform formdata body mode with variable config', () => {
      const code = `
        const requestConfig = {
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            data: {
                "firstName": "John",
                "lastName": "Doe"
            }
        };
        bru.sendRequest(requestConfig, function (error, response) {
            console.log(response.data);
        });
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        const requestConfig = {
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {
                'Content-Type': 'multipart/form-data',
            },
            body: {
                mode: "formdata",

                formdata: [{
                    key: "firstName",
                    value: "John"
                }, {
                    key: "lastName",
                    value: "Doe"
                }]
            }
        };
        pm.sendRequest(requestConfig, function(error, response) {
            console.log(response.json());
        });
      `);
    });

    it('should transform variable config without callback', () => {
      const code = `
        const requestConfig = {
            url: 'https://echo.usebruno.com',
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        };
        bru.sendRequest(requestConfig);
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        const requestConfig = {
            url: 'https://echo.usebruno.com',
            method: 'GET',
            header: {
                'Accept': 'application/json'
            }
        };
        pm.sendRequest(requestConfig);
      `);
    });

    it('should transform variable config with raw text body', () => {
      const code = `
        const requestConfig = {
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            data: 'Hello World'
        };
        bru.sendRequest(requestConfig, function (error, response) {
            console.log(response.data);
        });
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        const requestConfig = {
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {
                'Content-Type': 'text/plain',
            },
            body: {
                mode: "raw",
                raw: 'Hello World'
            }
        };
        pm.sendRequest(requestConfig, function(error, response) {
            console.log(response.json());
        });
      `);
    });

    it('should transform variable config with arrow function callback', () => {
      const code = `
        const requestConfig = {
            url: 'https://echo.usebruno.com',
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        };
        bru.sendRequest(requestConfig, (error, response) => {
            console.log(response.data);
        });
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        const requestConfig = {
            url: 'https://echo.usebruno.com',
            method: 'GET',
            header: {
                'Accept': 'application/json'
            }
        };
        pm.sendRequest(requestConfig, function(error, response) {
            console.log(response.json());
        });
      `);
    });

    it('should transform variable config with async arrow function callback', () => {
      const code = `
        const requestConfig = {
            url: 'https://echo.usebruno.com',
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        };
        bru.sendRequest(requestConfig, async (error, response) => {
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log(response.data);
        });
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        const requestConfig = {
            url: 'https://echo.usebruno.com',
            method: 'GET',
            header: {
                'Accept': 'application/json'
            }
        };
        pm.sendRequest(requestConfig, async function(error, response) {
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log(response.json());
        });
      `);
    });
  });

  describe('Without Callback', () => {
    it('should transform sendRequest without callback', () => {
      const code = `
        bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'GET',
            header: {
                'Accept': 'application/json'
            }
        });
      `);
    });
  });

  describe('Simple URL Request', () => {
    it('should handle string URL argument', () => {
      const code = `
        bru.sendRequest('https://echo.usebruno.com');
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        pm.sendRequest('https://echo.usebruno.com');
      `);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle sendRequest inside try-catch', () => {
      const code = `
        try {
            bru.sendRequest({
                url: 'https://echo.usebruno.com',
                method: 'GET'
            }, function (error, response) {
                if (error) {
                    console.error(error);
                }
                console.log(response.data);
            });
        } catch (err) {
            console.error(err);
        }
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        try {
            pm.sendRequest({
                url: 'https://echo.usebruno.com',
                method: 'GET'
            }, function(error, response) {
                if (error) {
                    console.error(error);
                }
                console.log(response.json());
            });
        } catch (err) {
            console.error(err);
        }
      `);
    });

    it('should handle sendRequest with conditional logic in callback', () => {
      const code = `
        bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'GET'
        }, function (error, response) {
            if (response.status === 200) {
                const data = response.data;
                console.log('Success:', data);
            } else {
                console.log('Error:', response.statusText);
            }
        });
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toBe(`
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'GET'
        }, function(error, response) {
            if (response.code === 200) {
                const data = response.json();
                console.log('Success:', data);
            } else {
                console.log('Error:', response.status);
            }
        });
      `);
    });
  });
});
