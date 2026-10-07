import translateCode from '../../../../src/utils/postman-to-bruno-translator';

describe('Typed bindings', () => {
  describe('sendRequest response held in a variable', () => {
    it('should map response members on an awaited binding', () => {
      const code = `
        const r = await pm.sendRequest({ url: 'https://echo.usebruno.com' });
        console.log(r.code, r.json(), r.text(), r.status);
      `;
      expect(translateCode(code)).toContain('console.log(r.status, r.data, r.data, r.statusText);');
    });

    it('should map response members when the call is not awaited in the source', () => {
      const code = `
        const r = pm.sendRequest({ url: 'https://echo.usebruno.com' });
        console.log(r.code);
      `;
      const translatedCode = translateCode(code);
      expect(translatedCode).toContain('const r = await bru.sendRequest(');
      expect(translatedCode).toContain('console.log(r.status);');
    });

    it('should not cascade code -> status -> statusText within one pass', () => {
      const code = `
        const r = await pm.sendRequest(req);
        console.log(\`\${r.code} \${r.status}\`);
      `;
      expect(translateCode(code)).toContain('`${r.status} ${r.statusText}`');
    });

    it('should map a computed access with a literal key', () => {
      const code = `
        const r = await pm.sendRequest(req);
        console.log(r['code']);
      `;
      expect(translateCode(code)).toContain('console.log(r.status);');
    });

    it('should leave a computed access with a non-literal key alone', () => {
      const code = `
        const r = await pm.sendRequest(req);
        console.log(r[key]);
      `;
      expect(translateCode(code)).toContain('console.log(r[key]);');
    });

    it('should map members used inside a test assertion', () => {
      const code = `
        const r = await pm.sendRequest(req);
        pm.test('ok', () => {
          pm.expect(r.code).to.eql(200);
          pm.expect(r.json().id).to.eql(1);
        });
      `;
      const translatedCode = translateCode(code);
      expect(translatedCode).toContain('expect(r.status).to.eql(200);');
      expect(translatedCode).toContain('expect(r.data.id).to.eql(1);');
    });
  });

  describe('bindings whose contents are not certain', () => {
    it('should leave a binding reassigned after its declaration alone', () => {
      const code = `
        let r = await pm.sendRequest(req);
        r = cached;
        console.log(r.code);
      `;
      expect(translateCode(code)).toContain('console.log(r.code);');
    });

    /**
     * ast-types models function scope, not block scope, so both declarations of `r` resolve
     * to the Program scope and references can't be attributed to either.
     */
    it('should leave a name re-declared in a nested block alone', () => {
      const code = `
        const r = await pm.sendRequest(req);
        console.log(r.code);
        if (retry) {
          const r = cached;
          console.log(r.code);
        }
      `;
      const translatedCode = translateCode(code);
      expect(translatedCode).not.toContain('r.status');
      expect(translatedCode.match(/r\.code/g)).toHaveLength(2);
    });

    it('should rewrite the binding but not a function parameter shadowing its name', () => {
      const code = `
        const r = await pm.sendRequest(req);
        console.log(r.code);
        function describeOther(r) { return r.code; }
      `;
      const translatedCode = translateCode(code);
      expect(translatedCode).toContain('console.log(r.status);');
      expect(translatedCode).toContain('function describeOther(r) { return r.code; }');
    });

    it('should not follow a plain alias of a typed binding', () => {
      const code = `
        const r = await pm.sendRequest(req);
        const alias = r;
        console.log(alias.code);
      `;
      expect(translateCode(code)).toContain('console.log(alias.code);');
    });
  });

  describe('cookie jar held in a variable', () => {
    it('should rename jar methods on the binding', () => {
      const code = `
        const jar = pm.cookies.jar();
        jar.set('https://echo.usebruno.com', 'sessionId', 'abc123', (err) => {});
        jar.getAll('https://echo.usebruno.com', (err, cookies) => {});
      `;
      const translatedCode = translateCode(code);
      expect(translatedCode).toContain('const jar = bru.cookies.jar();');
      expect(translatedCode).toContain('jar.setCookie(\'https://echo.usebruno.com\', \'sessionId\', \'abc123\', (err) => {});');
      expect(translatedCode).toContain('jar.getCookies(\'https://echo.usebruno.com\', (err, cookies) => {});');
    });

    it('should not rename a method on a parameter shadowing the jar name', () => {
      const code = `
        const jar = pm.cookies.jar();
        jar.get('https://echo.usebruno.com', 'sessionId', cb);
        function readFrom(jar) { return jar.get('sessionId'); }
      `;
      const translatedCode = translateCode(code);
      expect(translatedCode).toContain('jar.getCookie(\'https://echo.usebruno.com\', \'sessionId\', cb);');
      expect(translatedCode).toContain('function readFrom(jar) { return jar.get(\'sessionId\'); }');
    });
  });

  describe('destructured bindings', () => {
    it('should rename the key and keep the local name', () => {
      const code = 'const { code } = await pm.sendRequest(q);\nconsole.log(code);';
      const translatedCode = translateCode(code);
      expect(translatedCode).toContain('const { status: code } = await bru.sendRequest(q);');
      expect(translatedCode).toContain('console.log(code);');
    });

    it('should rename several members without one rename feeding the next', () => {
      const code = 'const { code, status } = await pm.sendRequest(q);';
      expect(translateCode(code)).toContain('const { status: code, statusText: status } =');
    });

    it('should keep an explicit alias', () => {
      const code = 'const { code: statusCode } = await pm.sendRequest(q);';
      expect(translateCode(code)).toContain('const { status: statusCode } =');
    });

    it('should keep a default value', () => {
      const code = 'const { code = 0 } = await pm.sendRequest(q);';
      expect(translateCode(code)).toContain('const { status: code = 0 } =');
    });

    it('should rewrite a destructured callback parameter', () => {
      const code = 'pm.sendRequest(q, (err, { code }) => console.log(code));';
      expect(translateCode(code)).toContain('(err, { status: code }) => console.log(code)');
    });

    it('should rewrite a destructured then handler parameter', () => {
      const code = 'pm.sendRequest(q).then(({ code }) => console.log(code));';
      expect(translateCode(code)).toContain('.then(({ status: code }) => console.log(code))');
    });

    it('should skip a member whose arity differs, since a pattern cannot express the call', () => {
      const code = 'const { json } = await pm.sendRequest(q);';
      expect(translateCode(code)).toContain('const { json } =');
    });

    it('should leave a pattern with a rest element whole', () => {
      const code = 'const { code, ...rest } = await pm.sendRequest(q);';
      expect(translateCode(code)).toContain('const { code, ...rest } =');
    });

    it('should skip a computed key but still rename its siblings', () => {
      const code = 'const { [k]: v, code } = await pm.sendRequest(q);';
      expect(translateCode(code)).toContain('const { [k]: v, status: code } =');
    });

    it('should skip a nested pattern but still rename its siblings', () => {
      const code = 'const { headers: { x }, code } = await pm.sendRequest(q);';
      expect(translateCode(code)).toContain('const { headers: { x }, status: code } =');
    });
  });
});
