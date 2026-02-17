import translateBruToPostman from '../../../src/utils/bruno-to-postman-translator';

describe('Bruno to Postman Response Translation', () => {
  // Basic response property tests
  it('should translate res.getBody()', () => {
    const code = 'const jsonData = res.getBody();';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const jsonData = pm.response.json();');
  });

  it('should translate res.getStatus() to pm.response.code (function to property)', () => {
    const code = 'if (res.getStatus() === 200) { console.log("Success"); }';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('if (pm.response.code === 200) { console.log("Success"); }');
  });

  it('should translate JSON.stringify(res.getBody()) to pm.response.text()', () => {
    const code = 'const responseText = JSON.stringify(res.getBody());';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const responseText = pm.response.text();');
  });

  it('should translate res.getResponseTime() to pm.response.responseTime (function to property)', () => {
    const code = 'console.log("Response time:", res.getResponseTime());';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('console.log("Response time:", pm.response.responseTime);');
  });

  it('should translate res.statusText to pm.response.status (property to property)', () => {
    const code = 'console.log("Status text:", res.statusText);';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('console.log("Status text:", pm.response.status);');
  });

  it('should translate res.status to pm.response.code (property to property)', () => {
    const code = 'const code = res.status;';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const code = pm.response.code;');
  });

  it('should translate res.getStatusText() to pm.response.status (function to property)', () => {
    const code = 'const statusText = res.getStatusText();';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const statusText = pm.response.status;');
  });

  it('should translate res.getHeaders() to pm.response.headers (function to property)', () => {
    const code = 'console.log("Headers:", res.getHeaders());';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('console.log("Headers:", pm.response.headers);');
  });

  it('should translate res.getUrl() to pm.response.url (function to property)', () => {
    const code = 'const url = res.getUrl();';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const url = pm.response.url;');
  });

  it('should translate res.url to pm.response.url (property to property)', () => {
    const code = 'const url = res.url;';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const url = pm.response.url;');
  });

  it('should translate res.getHeader()', () => {
    const code = 'const contentType = res.getHeader("Content-Type");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const contentType = pm.response.headers.get("Content-Type");');
  });

  // Response assertions - translated to pm.expect with response properties
  it('should transform expect(res.getStatus()).to.equal() to pm.expect(pm.response.code).to.equal()', () => {
    const code = 'expect(res.getStatus()).to.equal(201);';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.expect(pm.response.code).to.equal(201);');
  });

  it('should transform expect(res.getHeaders()).to.have.property() to pm.expect(pm.response.headers).to.have.property()', () => {
    const code = 'expect(res.getHeaders()).to.have.property("Content-Type".toLowerCase());';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.expect(pm.response.headers).to.have.property("Content-Type".toLowerCase());');
  });

  it('should transform expect(res.getBody()).to.equal() to pm.expect(pm.response.json()).to.equal()', () => {
    const code = 'expect(res.getBody()).to.equal("Expected response body");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.expect(pm.response.json()).to.equal("Expected response body");');
  });

  // getSize translations
  it('should translate res.getSize()', () => {
    const code = 'const size = res.getSize();';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const size = pm.response.size();');
  });

  it('should translate res.getSize().body', () => {
    const code = 'const bodySize = res.getSize().body;';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const bodySize = pm.response.size().body;');
  });

  it('should translate res.getSize().header', () => {
    const code = 'const headerSize = res.getSize().header;';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const headerSize = pm.response.size().header;');
  });

  it('should translate res.getSize().total', () => {
    const code = 'const totalSize = res.getSize().total;';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const totalSize = pm.response.size().total;');
  });

  // Complex response handling
  it('should handle response data with destructuring', () => {
    const code = `
const { id, name, items } = res.getBody();
const [first, second] = items;
bru.setEnvVar("userId", id);
`;
    const translatedCode = translateBruToPostman(code);
    const expected = `
const { id, name, items } = pm.response.json();
const [first, second] = items;
pm.environment.set("userId", id);
`;
    expect(translatedCode.trim()).toBe(expected.trim());
  });

  it('should handle response JSON with optional chaining', () => {
    const code = `
const userId = res.getBody()?.user?.id ?? "anonymous";
const items = res.getBody()?.data?.items || [];
`;
    const translatedCode = translateBruToPostman(code);
    const expected = `
const userId = pm.response.json()?.user?.id ?? "anonymous";
const items = pm.response.json()?.data?.items || [];
`;
    expect(translatedCode.trim()).toBe(expected.trim());
  });

  it('should handle response in complex conditionals', () => {
    const code = `
if (res.getStatus() >= 200 && res.getStatus() < 300) {
    if (res.getHeader('Content-Type').includes('application/json')) {
        const data = res.getBody();

        if (data.success === true && data.token) {
            bru.setEnvVar("authToken", data.token);
        } else if (data.error) {
            console.error("API error:", data.error);
        }
    }
} else if (res.getStatus() === 404) {
    console.log("Resource not found");
} else {
    console.error("Request failed with status:", res.getStatus());
}
`;
    const translatedCode = translateBruToPostman(code);
    const expected = `
if (pm.response.code >= 200 && pm.response.code < 300) {
    if (pm.response.headers.get('Content-Type').includes('application/json')) {
        const data = pm.response.json();

        if (data.success === true && data.token) {
            pm.environment.set("authToken", data.token);
        } else if (data.error) {
            console.error("API error:", data.error);
        }
    }
} else if (pm.response.code === 404) {
    console.log("Resource not found");
} else {
    console.error("Request failed with status:", pm.response.code);
}
`;
    expect(translatedCode.trim()).toBe(expected.trim());
  });

  it('should handle all response property methods together', () => {
    const code = `
// All response property methods
const statusCode = res.getStatus();
const responseBody = res.getBody();
const statusText = res.statusText;
const responseTime = res.getResponseTime();
`;
    const translatedCode = translateBruToPostman(code);
    const expected = `
// All response property methods
const statusCode = pm.response.code;
const responseBody = pm.response.json();
const statusText = pm.response.status;
const responseTime = pm.response.responseTime;
`;
    expect(translatedCode.trim()).toBe(expected.trim());
  });

  it('should handle response processing in arrow functions', () => {
    const code = `
const processItems = () => {
    const items = res.getBody().items;
    return items.map(item => item.id);
};

const itemIds = processItems();
bru.setEnvVar("itemIds", JSON.stringify(itemIds));
`;
    const translatedCode = translateBruToPostman(code);
    const expected = `
const processItems = () => {
    const items = pm.response.json().items;
    return items.map(item => item.id);
};

const itemIds = processItems();
pm.environment.set("itemIds", JSON.stringify(itemIds));
`;
    expect(translatedCode.trim()).toBe(expected.trim());
  });

  it('should translate res.responseTime property to pm.response.responseTime', () => {
    const code = 'const time = res.responseTime;';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const time = pm.response.responseTime;');
  });

  it('should translate res.headers property to pm.response.headers', () => {
    const code = 'const headers = res.headers;';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const headers = pm.response.headers;');
  });

  it('should handle res.responseTime in conditionals', () => {
    const code = 'if (res.responseTime > 1000) { console.log("Slow response"); }';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('if (pm.response.responseTime > 1000) { console.log("Slow response"); }');
  });

  it('should handle res.headers property access', () => {
    const code = 'const contentType = res.headers["Content-Type"];';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const contentType = pm.response.headers["Content-Type"];');
  });

  it('should handle both res.responseTime property and res.getResponseTime() method', () => {
    const code = `
const time1 = res.responseTime;
const time2 = res.getResponseTime();
`;
    const translatedCode = translateBruToPostman(code);
    const expected = `
const time1 = pm.response.responseTime;
const time2 = pm.response.responseTime;
`;
    expect(translatedCode.trim()).toBe(expected.trim());
  });

  it('should handle both res.headers property and res.getHeaders() method', () => {
    const code = `
const headers1 = res.headers;
const headers2 = res.getHeaders();
`;
    const translatedCode = translateBruToPostman(code);
    const expected = `
const headers1 = pm.response.headers;
const headers2 = pm.response.headers;
`;
    expect(translatedCode.trim()).toBe(expected.trim());
  });
});
