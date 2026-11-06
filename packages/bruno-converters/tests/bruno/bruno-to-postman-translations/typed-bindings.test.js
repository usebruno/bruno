import translateBruToPostman from '../../../src/utils/bruno-to-postman-translator';

describe('Typed bindings (Bruno -> Postman)', () => {
  describe('sendRequest response held in a variable', () => {
    it('should map response members on an awaited binding', () => {
      const code = `
        const r = await bru.sendRequest({ url: 'https://echo.usebruno.com' });
        console.log(r.status, r.data, r.statusText);
      `;
      expect(translateBruToPostman(code)).toContain('console.log(r.code, r.json(), r.status);');
    });

    it('should add the call back when a property becomes a method', () => {
      const code = `
        const r = await bru.sendRequest(req);
        bru.setEnvVar('token', r.data.token);
      `;
      expect(translateBruToPostman(code)).toContain('pm.environment.set(\'token\', r.json().token);');
    });

    it('should not cascade statusText -> status -> code within one pass', () => {
      const code = `
        const r = await bru.sendRequest(req);
        console.log(\`\${r.statusText} \${r.status}\`);
      `;
      expect(translateBruToPostman(code)).toContain('`${r.status} ${r.code}`');
    });

    it('should still map response members on a callback parameter', () => {
      const code = 'bru.sendRequest({ url: \'https://echo.usebruno.com\' }, (err, res) => { console.log(res.status, res.data); });';
      expect(translateBruToPostman(code)).toContain('console.log(res.code, res.json());');
    });
  });

  describe('bindings whose contents are not certain', () => {
    it('should leave a binding reassigned after its declaration alone', () => {
      const code = `
        let r = await bru.sendRequest(req);
        r = cached;
        console.log(r.status);
      `;
      expect(translateBruToPostman(code)).toContain('console.log(r.status);');
    });

    it('should leave a name re-declared in a nested block alone', () => {
      const code = `
        const r = await bru.sendRequest(req);
        console.log(r.status);
        if (retry) {
          const r = cached;
          console.log(r.status);
        }
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).not.toContain('r.code');
      expect(translatedCode.match(/r\.status/g)).toHaveLength(2);
    });
  });

  describe('cookie jar held in a variable', () => {
    it('should rename jar methods on the binding', () => {
      const code = `
        const jar = bru.cookies.jar();
        jar.setCookie('https://echo.usebruno.com', 'sessionId', 'abc123');
        jar.getCookies('https://echo.usebruno.com');
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toContain('const jar = pm.cookies.jar();');
      expect(translatedCode).toContain('jar.set(\'https://echo.usebruno.com\', \'sessionId\', \'abc123\');');
      expect(translatedCode).toContain('jar.getAll(\'https://echo.usebruno.com\');');
    });

    it('should not rename a method on a parameter shadowing the jar name', () => {
      const code = `
        const jar = bru.cookies.jar();
        jar.getCookie('https://echo.usebruno.com', 'sessionId');
        function readFrom(jar) { return jar.getCookie('sessionId'); }
      `;
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toContain('jar.get(\'https://echo.usebruno.com\', \'sessionId\');');
      expect(translatedCode).toContain('function readFrom(jar) { return jar.getCookie(\'sessionId\'); }');
    });
  });

  describe('destructured bindings', () => {
    it('should rename the key and keep the local name', () => {
      const code = 'const { status } = await bru.sendRequest(q);';
      expect(translateBruToPostman(code)).toContain('const { code: status } = await pm.sendRequest(q);');
    });

    /**
     * The pattern used to be discarded and rebuilt as a plain `response` parameter, which left
     * everything it bound undeclared in the body.
     */
    it('should keep a destructured callback parameter instead of replacing it', () => {
      const code = 'bru.sendRequest(q, (err, { status }) => { console.log(status); });';
      const translatedCode = translateBruToPostman(code);
      expect(translatedCode).toContain('function(err, { code: status })');
      expect(translatedCode).toContain('console.log(status);');
    });

    it('should still fill in a missing response parameter', () => {
      const code = 'bru.sendRequest(q, (err) => { console.log(err); });';
      expect(translateBruToPostman(code)).toContain('function(err, response)');
    });

    it('should skip a member whose arity differs', () => {
      const code = 'const { data } = await bru.sendRequest(q);';
      expect(translateBruToPostman(code)).toContain('const { data } =');
    });
  });
});
