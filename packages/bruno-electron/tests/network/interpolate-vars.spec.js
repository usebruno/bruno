const interpolateVars = require('../../src/ipc/network/interpolate-vars');

describe('interpolate-vars: interpolateVars', () => {
  describe('Interpolates string', () => {
    describe('With environment variables', () => {
      it("If there's a var with only alphanumeric characters in its name", async () => {
        const request = { method: 'GET', url: '{{testUrl1}}' };

        const result = interpolateVars(request, { testUrl1: 'test.com' }, null, null);
        expect(result.url).toEqual('test.com');
      });

      it("If there's a var with a '.' in its name", async () => {
        const request = { method: 'GET', url: '{{test.url}}' };

        const result = interpolateVars(request, { 'test.url': 'test.com' }, null, null);
        expect(result.url).toEqual('test.com');
      });

      it("If there's a var with a '-' in its name", async () => {
        const request = { method: 'GET', url: '{{test-url}}' };

        const result = interpolateVars(request, { 'test-url': 'test.com' }, null, null);
        expect(result.url).toEqual('test.com');
      });

      it("If there's a var with a '_' in its name", async () => {
        const request = { method: 'GET', url: '{{test_url}}' };

        const result = interpolateVars(request, { test_url: 'test.com' }, null, null);
        expect(result.url).toEqual('test.com');
      });

      it('If there are multiple variables', async () => {
        const body =
          '{\n  "firstElem": {{body-var-1}},\n  "secondElem": [{{body.var.2}}],\n  "thirdElem": {\n    "fourthElem": {{body_var_3}},\n    "{{varAsKey}}": {{valueForKey}} }}';
        const expectedBody =
          '{\n  "firstElem": Test1,\n  "secondElem": [Test2],\n  "thirdElem": {\n    "fourthElem": Test3,\n    "TestKey": TestValueForKey }}';

        const request = { method: 'POST', url: 'test', data: body, headers: { 'content-type': 'json' } };
        const result = interpolateVars(
          request,
          {
            'body-var-1': 'Test1',
            'body.var.2': 'Test2',
            body_var_3: 'Test3',
            varAsKey: 'TestKey',
            valueForKey: 'TestValueForKey'
          },
          null,
          null
        );
        expect(result.data).toEqual(expectedBody);
      });
    });

    describe('With process environment variables', () => {
      /*
       * It should NOT turn process env vars into literal segments.
       * Otherwise, Handlebars will try to access the var literally
       */
      it("If there's a var that starts with 'process.env.'", async () => {
        const request = { method: 'GET', url: '{{process.env.TEST_VAR}}' };

        const result = interpolateVars(request, null, null, { TEST_VAR: 'test.com' });
        expect(result.url).toEqual('test.com');
      });
    });
  });

  describe('Does NOT interpolate string', () => {
    describe('With environment variables', () => {
      it("If it's not a var (no braces)", async () => {
        const request = { method: 'GET', url: 'test' };

        const result = interpolateVars(request, { 'test.url': 'test.com' }, null, null);
        expect(result.url).toEqual('test');
      });

      it("If it's not a var (only 1 set of braces)", async () => {
        const request = { method: 'GET', url: '{test.url}' };

        const result = interpolateVars(request, { 'test.url': 'test.com' }, null, null);
        expect(result.url).toEqual('{test.url}');
      });

      it("If it's not a var (1 opening & 2 closing braces)", async () => {
        const request = { method: 'GET', url: '{test.url}}' };

        const result = interpolateVars(request, { 'test.url': 'test.com' }, null, null);
        expect(result.url).toEqual('{test.url}}');
      });

      it('If there are no variables (multiple)', async () => {
        let gqlBody = `{"query":"mutation {\\n  test(input: { native: { firstElem: \\"{should-not-get-interpolated}\\", secondElem: \\"{should-not-get-interpolated}}"}}) {\\n    __typename\\n    ... on TestType {\\n      id\\n      identifier\\n    }\\n  }\\n}","variables":"{}"}`;

        const request = { method: 'POST', url: 'test', data: gqlBody };
        const result = interpolateVars(request, { 'should-not-get-interpolated': 'ERROR' }, null, null);
        expect(result.data).toEqual(gqlBody);
      });
    });
  });

  describe('Handles content-type header set to false', () => {
    it('Should result empty data', async () => {
      const request = { method: 'POST', url: 'test', data: undefined, headers: { 'content-type': false } };

      const result = interpolateVars(request, { 'test.url': 'test.com' }, null, null);
      expect(result.data).toEqual(undefined);
    });
  });
});
