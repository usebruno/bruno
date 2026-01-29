import translateCode from '../../../../src/utils/postman-to-bruno-translator';

describe('Legacy Postman API Translation', () => {
  describe('handleLegacyGlobalAPIs - No Conflicts', () => {
    test('should translate responseBody when no user variables exist', () => {
      const input = `
        const data = JSON.parse(responseBody);
`;

      const result = translateCode(input);
      const expected = `
        const data = res.getBody();
`;

      expect(result).toEqual(expected);
    });

    test('should translate responseHeaders when no user variables exist', () => {
      const input = `
        console.log(responseHeaders);
        const headers = responseHeaders;
      `;

      const result = translateCode(input);

      expect(result).toContain('res.getHeaders()');
      expect(result).not.toContain('responseHeaders');
    });

    test('should translate responseTime when no user variables exist', () => {
      const input = `
        console.log(responseTime);
        const time = responseTime;
      `;

      const result = translateCode(input);

      expect(result).toContain('res.getResponseTime()');
      expect(result).not.toContain('responseTime');
    });

    test('should translate JSON.parse(responseBody) when no user variables exist', () => {
      const input = `
        const data = JSON.parse(responseBody);
        console.log(data);
      `;

      const result = translateCode(input);

      expect(result).toContain('res.getBody()');
      expect(result).not.toContain('JSON.parse(responseBody)');
      expect(result).not.toContain('responseBody');
    });

    test('should translate JSON.parse(responseBody) usage without assignment when no user variables exist', () => {
      const input = `
        console.log(JSON.parse(responseBody));
      `;

      const result = translateCode(input);
      const expected = `
        console.log(res.getBody());
      `;

      expect(result).toContain(expected);
    });

    test('should translate all legacy APIs when no conflicts exist', () => {
      const input = `
        const data = JSON.parse(responseBody);
        const headers = responseHeaders;
        const time = responseTime;
        
        console.log(data, headers, time);
      `;

      const result = translateCode(input);

      expect(result).toContain('res.getBody()');
      expect(result).toContain('res.getHeaders()');
      expect(result).toContain('res.getResponseTime()');
      expect(result).not.toContain('responseBody');
      expect(result).not.toContain('responseHeaders');
      expect(result).not.toContain('responseTime');
    });
  });

  describe('handleLegacyGlobalAPIs - With Conflicts', () => {
    test('should NOT translate responseBody when user variable exists', () => {
      const input = `
        const responseBody = pm.response.json();
        console.log(responseBody);
      `;

      const result = translateCode(input);
      const expected = `
        const responseBody = res.getBody();
        console.log(responseBody);
      `;

      // pm.response.json() should be transformed to res.getBody() (Postman API transformation)
      expect(result).toEqual(expected);
    });

    test('should NOT translate responseHeaders when user variable exists', () => {
      const input = `
        const responseHeaders = pm.response.headers;
        console.log(responseHeaders);
      `;

      const result = translateCode(input);
      const expected = `
        const responseHeaders = res.getHeaders();
        console.log(responseHeaders);
      `;

      expect(result).toEqual(expected);
    });

    test('should NOT translate responseTime when user variable exists', () => {
      const input = `
        const responseTime = pm.response.responseTime;
        console.log(responseTime);
      `;

      const result = translateCode(input);
      const expected = `
        const responseTime = res.getResponseTime();
        console.log(responseTime);
      `;

      expect(result).toEqual(expected);
    });

    test('should NOT translate JSON.parse(responseBody) when user variable exists', () => {
      const input = `
        const responseBody = pm.response.json();
        const data = JSON.parse(responseBody);
        console.log(data);
      `;

      const result = translateCode(input);
      const expected = `
        const responseBody = res.getBody();
        const data = JSON.parse(responseBody);
        console.log(data);
      `;

      expect(result).toEqual(expected);
    });
  });

  describe('handleLegacyGlobalAPIs - Partial Conflicts', () => {
    test('should translate non-conflicting APIs when some conflicts exist', () => {
      const input = `
        const responseBody = pm.response.json();
        console.log(responseBody);
        console.log(responseHeaders);
        console.log(responseTime);
      `;

      const result = translateCode(input);
      const expected = `
        const responseBody = res.getBody();
        console.log(responseBody);
        console.log(res.getHeaders());
        console.log(res.getResponseTime());
      `;

      expect(result).toEqual(expected);
    });

    test('should translate JSON.parse(responseBody) only when no conflict exists', () => {
      const input = `
        const responseHeaders = pm.response.headers;
        const data = JSON.parse(responseBody);
        console.log(responseHeaders);
      `;

      const result = translateCode(input);
      const expected = `
        const responseHeaders = res.getHeaders();
        const data = res.getBody();
        console.log(responseHeaders);
      `;

      expect(result).toEqual(expected);
    });
  });

  describe('handleLegacyGlobalAPIs - Edge Cases', () => {
    test.skip('should handle function parameters with legacy names', () => {
      const input = `
        function test(responseBody) {
          console.log(responseBody);
          console.log(responseHeaders);
        }
      `;

      const result = translateCode(input);
      const expected = `
        function test(responseBody) {
          console.log(responseBody);
          console.log(res.getHeaders());
        }
      `;

      expect(result).toEqual(expected);
    });

    test('should handle object properties with legacy names', () => {
      const input = `
        const config = {
          responseBody: 'custom',
          responseHeaders: 'custom'
        };
        console.log(responseTime);
      `;

      const result = translateCode(input);

      const expected = `
        const config = {
          responseBody: 'custom',
          responseHeaders: 'custom'
        };
        console.log(res.getResponseTime());
      `;

      expect(result).toEqual(expected);
    });

    test('should handle assignments with legacy names', () => {
      const input = `
        responseBody = 'new value';
        responseHeaders = 'new headers';
        console.log(responseTime);
      `;

      const result = translateCode(input);

      const expected = `
        responseBody = 'new value';
        responseHeaders = 'new headers';
        console.log(res.getResponseTime());
      `;

      expect(result).toEqual(expected);
    });

    test('should handle mixed usage patterns', () => {
      const input = `
        const responseBody = pm.response.json();
        const data = JSON.parse(responseBody);
        console.log(responseHeaders);
        console.log(responseTime);
        
        function test(data) {
          console.log(responseBody);
          console.log(responseHeaders);
        }
      `;

      const result = translateCode(input);

      const expected = `
        const responseBody = res.getBody();
        const data = JSON.parse(responseBody);
        console.log(res.getHeaders());
        console.log(res.getResponseTime());
        
        function test(data) {
          console.log(responseBody);
          console.log(res.getHeaders());
        }
      `;

      expect(result).toEqual(expected);
    });
  });

  describe('handleLegacyGlobalAPIs - No Legacy APIs', () => {
    test('should not modify code when no legacy APIs are present', () => {
      const input = `
        const data = { name: 'test' };
        console.log(data.name);
      `;

      const result = translateCode(input);
      const expected = `
        const data = { name: 'test' };
        console.log(data.name);
      `;

      expect(result).toEqual(expected);
    });
  });
});
