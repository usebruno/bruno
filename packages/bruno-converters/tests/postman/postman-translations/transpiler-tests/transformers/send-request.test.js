import translateCode from '../../../../../src/utils/postman-to-bruno-translator';

describe('Send Request Translation', () => {
  describe('Raw Body Mode', () => {
    it('should transform raw JSON string body', () => {
      const code = `
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: {
                mode: 'raw',
                raw: JSON.stringify({
                    "x": 1
                })
            }
        }, async function (error, response) {
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
      `;
      const translatedCode = translateCode(code);
      expect(translatedCode).toBe(`
        await bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            data: JSON.stringify({
                "x": 1
            })
        }, async function(error, response) {
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
      `);
    });

    it('should transform raw JSON object body', () => {
      const code = `
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: {
                mode: 'raw',
                raw: {
                    "x": 1
                }
            }
        }, function (error, response) {
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
      `;
      const translatedCode = translateCode(code);
      expect(translatedCode).toBe(`
        await bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            data: {
                "x": 1
            }
        }, async function(error, response) {
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
      `);
    });

    it('should transform raw text body', () => {
      const code = `
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {
                'Content-Type': 'text/plain',
            },
            body: {
                mode: 'raw',
                raw: 'Hello World'
            }
        }, function (error, response) {
            console.log(response.text());
        });
      `;
      const translatedCode = translateCode(code);
      expect(translatedCode).toBe(`
        await bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            data: 'Hello World'
        }, async function(error, response) {
            console.log(response.data);
        });
      `);
    });
  });

  describe('URL-encoded Body Mode', () => {
    it('should transform urlencoded body with single key-value pair', () => {
      const code = `
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: {
                mode: 'urlencoded',
                urlencoded: [
                    { key: "key", value: "value" }
                ]
            }
        }, function (error, response) {
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
      `;
      const translatedCode = translateCode(code);
      expect(translatedCode).toBe(`
        await bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data: {
                "key": "value"
            }
        }, async function(error, response) {
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
      `);
    });

    it('should transform urlencoded body with multiple key-value pairs', () => {
      const code = `
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {},
            body: {
                mode: 'urlencoded',
                urlencoded: [
                    { key: "firstName", value: "John" },
                    { key: "lastName", value: "Doe" },
                    { key: "email", value: "john.doe@example.com" }
                ]
            }
        }, function (error, response) {
            console.log(response.json());
        });
      `;
      const translatedCode = translateCode(code);
      expect(translatedCode).toBe(`
        await bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data: {
                "firstName": "John",
                "lastName": "Doe",
                "email": "john.doe@example.com"
            }
        }, async function(error, response) {
            console.log(response.data);
        });
      `);
    });

    it('should transform urlencoded body when no Content-Type header exists', () => {
      const code = `
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            body: {
                mode: 'urlencoded',
                urlencoded: [
                    { key: "key1", value: "value1" },
                    { key: "key2", value: "value2" }
                ]
            }
        });
    `;
      const translatedCode = translateCode(code);
      expect(translatedCode).toBe(`
        await bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',

            data: {
                "key1": "value1",
                "key2": "value2"
            },

            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        });
    `);
    });

    it('should transform urlencoded body with incorrect Content-Type header', () => {
      const code = `
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                "Content-Type": "text/plain"
            },
            body: {
                mode: 'urlencoded',
                urlencoded: [
                    { key: "key1", value: "value1" },
                    { key: "key2", value: "value2" }
                ]
            }
        });
    `;
      const translatedCode = translateCode(code);
      expect(translatedCode).toBe(`
        await bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data: {
                "key1": "value1",
                "key2": "value2"
            }
        });
    `);
    });
  });

  describe('Multi-part Form Data Body Mode', () => {
    it('should transform formdata body with single key-value pair', () => {
      const code = `
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {
                'Content-Type': 'multipart/form-data',
            },
            body: {
                mode: 'formdata',
                formdata: [
                    { key: "key", value: "value" }
                ]
            }
        }, function (error, response) {
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
      `;
      const translatedCode = translateCode(code);
      expect(translatedCode).toBe(`
        await bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                "Content-Type": "multipart/form-data",
            },
            data: {
                "key": "value"
            }
        }, async function(error, response) {
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
      `);
    });

    it('should transform formdata body with multiple key-value pair', () => {
      const code = `
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {
                'Content-Type': 'multipart/form-data',
            },
            body: {
                mode: 'formdata',
                formdata: [
                    { key: "firstName", value: "John" },
                    { key: "lastName", value: "Doe" },
                    { key: "email", value: "john.doe@example.com" }
                ]
            }
        }, function (error, response) {
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
      `;
      const translatedCode = translateCode(code);
      expect(translatedCode).toBe(`
        await bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                "Content-Type": "multipart/form-data",
            },
            data: {
                "firstName": "John",
                "lastName": "Doe",
                "email": "john.doe@example.com"
            }
        }, async function(error, response) {
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
      `);
    });

    it('should transform formdata body when no Content-Type header exists', () => {
      const code = `
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            body: {
                mode: 'formdata',
                formdata: [
                    { key: "firstName", value: "John" },
                    { key: "lastName", value: "Doe" },
                    { key: "email", value: "john.doe@example.com" }
                ]
            }
        }, function (error, response) {
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
      `;
      const translatedCode = translateCode(code);
      expect(translatedCode).toBe(`
        await bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',

            data: {
                "firstName": "John",
                "lastName": "Doe",
                "email": "john.doe@example.com"
            },

            headers: {
                "Content-Type": "multipart/form-data"
            }
        }, async function(error, response) {
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
      `);
    });

    it('should transform formdata body with incorrect Content-Type header', () => {
      const code = `
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                "Content-Type": "text/plain"
            },
            body: {
                mode: 'formdata',
                formdata: [
                    { key: "firstName", value: "John" },
                    { key: "lastName", value: "Doe" },
                    { key: "email", value: "john.doe@example.com" }
                ]
            }
        }, function (error, response) {
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
      `;
      const translatedCode = translateCode(code);
      expect(translatedCode).toBe(`
        await bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'POST',
            headers: {
                "Content-Type": "multipart/form-data"
            },
            data: {
                "firstName": "John",
                "lastName": "Doe",
                "email": "john.doe@example.com"
            }
        }, async function(error, response) {
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
      `);
    });
  });

  describe('Headers and Content-Type Handling', () => {
    it('should rename header property to headers', () => {
      const code = `
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'GET',
            header: {
                'X-Custom-Header': 'custom-value',
                'Authorization': 'Bearer token'
            }
        });
      `;
      const translatedCode = translateCode(code);
      expect(translatedCode).toBe(`
        await bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'GET',
            headers: {
                'X-Custom-Header': 'custom-value',
                'Authorization': 'Bearer token'
            }
        });
      `);
    });

    it('should handle header array format', () => {
      const code = `
        pm.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'GET',
            header: [
                { key: 'X-Custom-Header', value: 'custom-value' },
                { key: 'Authorization', value: 'Bearer token' }
            ]
        });
      `;
      const translatedCode = translateCode(code);
      expect(translatedCode).toBe(`
        await bru.sendRequest({
            url: 'https://echo.usebruno.com',
            method: 'GET',
            headers: {
                "X-Custom-Header": 'custom-value',
                "Authorization": 'Bearer token'
            }
        });
      `);
    });
  });

  describe('Response Handling', () => {
    it('should transform response property access', () => {
      const code = `
        pm.sendRequest('https://echo.usebruno.com', function (error, response) {
            const status = response.code;
            const statusText = response.status;
            const headers = response.headers;
            const body = response.json();
            const responseTime = response.responseTime;
            const text = response.text();
            
            if (status === 200) {
                console.log('Success!');
            }
        });
      `;
      const translatedCode = translateCode(code);
      expect(translatedCode).toContain(`const status = response.status;
            const statusText = response.statusText;`);
      expect(translatedCode).toContain('const headers = response.headers');
      expect(translatedCode).toContain('const body = response.data');
      expect(translatedCode).toContain('const responseTime = response.responseTime');
      expect(translatedCode).toContain('const text = response.data');
    });
  });

  describe('Async/Await', () => {
    it('Should not add await if already present', () => {
      const code = `
        try {
            const response = await pm.sendRequest({
                url: "https://echo.usebruno.com",
                method: "GET"
            });

            console.log(response.json());
        } catch (err) {
            console.error(err);
        }
      `;
      const translatedCode = translateCode(code);
      expect(translatedCode).toBe(`
        try {
            const response = await bru.sendRequest({
                url: "https://echo.usebruno.com",
                method: "GET"
            });

            console.log(response.json());
        } catch (err) {
            console.error(err);
        }
      `);
    });

    it('Should handle arrow function callbacks', () => {
      const code = `
        try {
            pm.sendRequest({
                url: "https://echo.usebruno.com",
                method: "GET"
            }, (error, response) => {
                console.log(response.json());
            });
        } catch (err) {
            console.error(err);
        }
      `;
      const translatedCode = translateCode(code);
      expect(translatedCode).toBe(`
        try {
            await bru.sendRequest({
                url: "https://echo.usebruno.com",
                method: "GET"
            }, async function(error, response) {
                console.log(response.data);
            });
        } catch (err) {
            console.error(err);
        }
      `);
    });

    it('Should handle async arrow function callbacks', () => {
      const code = `
        try {
            pm.sendRequest({
                url: "https://echo.usebruno.com",
                method: "GET"
            }, async (error, response) => {
                await new Promise(resolve => {
                    setTimeout(() => {
                        resolve();
                    }, 1000)
                });
                console.log(response.json());
            });
        } catch (err) {
            console.error(err);
        }
      `;
      const translatedCode = translateCode(code);
      expect(translatedCode).toBe(`
        try {
            await bru.sendRequest({
                url: "https://echo.usebruno.com",
                method: "GET"
            }, async function(error, response) {
                await new Promise(resolve => {
                    setTimeout(() => {
                        resolve();
                    }, 1000)
                });
                console.log(response.data);
            });
        } catch (err) {
            console.error(err);
        }
      `);
    });
  });

  describe('requestConfig variables', () => {
    it('requestConfig passed as a variable', () => {
      const code = `
        const requestConfig = {
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: {
                mode: 'raw',
                raw: JSON.stringify({
                    "x": 1
                })
            }
        };
        pm.sendRequest(requestConfig, async function (error, response) {
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
      `;
      const translatedCode = translateCode(code);
      expect(translatedCode).toBe(`
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
        await bru.sendRequest(requestConfig, async function(error, response) {
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
      `);
    });

    it('requestConfig passed as a variable with multi-level references', () => {
      const code = `
        const requestConfig = {
            url: 'https://echo.usebruno.com',
            method: 'POST',
            header: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: {
                mode: 'raw',
                raw: JSON.stringify({
                    "x": 1
                })
            }
        };
        const requestConfig1 = requestConfig;
        const requestConfig2 = requestConfig1;
        const requestConfig3 = requestConfig2;
        pm.sendRequest(requestConfig3, async function (error, response) {
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
      `;
      const translatedCode = translateCode(code);
      expect(translatedCode).toBe(`
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
        const requestConfig1 = requestConfig;
        const requestConfig2 = requestConfig1;
        const requestConfig3 = requestConfig2;
        await bru.sendRequest(requestConfig3, async function(error, response) {
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
      `);
    });
  });
});
