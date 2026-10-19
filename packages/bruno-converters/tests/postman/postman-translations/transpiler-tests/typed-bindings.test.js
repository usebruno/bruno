import translateCode from '../../../../src/utils/postman-to-bruno-translator';

let warn;

beforeEach(() => {
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warn.mockRestore();
});
describe('Typed bindings', () => {
  describe('sendRequest response held in a variable', () => {
    it('should map response members on an awaited binding', () => {
      const code = `
        const r = await pm.sendRequest({ url: 'https://echo.usebruno.com' });
        console.log(r.code, r.json(), r.text(), r.status);
      `;
      expect(translateCode(code)).toContain('console.log(r.status, r.data, r.data, r.statusText);');
    });

    it('should follow a plain alias of a typed binding', () => {
      const code = `
        const r = await pm.sendRequest(req);
        const alias = r;
        console.log(alias.code);
      `;
      // neither binding is reassigned, so the alias holds the same response
      expect(translateCode(code)).toContain('console.log(alias.status);');
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

  /**
   * Where the two jars agree on the call but not on what it yields, the adaptation goes at
   * the call rather than at every later read, so the references need no visiting at all.
   */
  describe('values whose shape differs from the member that yields them', () => {
    it('should take the value off the cookie Bruno yields', () => {
      const code = `
        const jar = pm.cookies.jar();
        const token = await jar.get('https://a.com', 'sid');
        console.log(token.toUpperCase());
      `;
      const translatedCode = translateCode(code);

      expect(translatedCode).toContain('const token = (await jar.getCookie(\'https://a.com\', \'sid\')).value;');
      expect(translatedCode).toContain('console.log(token.toUpperCase());');
    });

    it('should leave a discarded result alone', () => {
      const code = `
        const jar = pm.cookies.jar();
        await jar.get('https://a.com', 'sid');
      `;
      const translatedCode = translateCode(code);

      expect(translatedCode).toContain('await jar.getCookie(\'https://a.com\', \'sid\');');
      expect(translatedCode).not.toContain('bruno-converter');
    });

    it('should leave the callback form as written', () => {
      const code = `
        const jar = pm.cookies.jar();
        jar.get('https://a.com', 'sid', (err, value) => console.log(value));
      `;
      const translatedCode = translateCode(code);

      expect(translatedCode).toContain('(err, value) => console.log(value)');
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('get (line 3) — only \'value\' of this value was expected')
      );
    });

    it('should leave a property whose shape differs as written', () => {
      const code = `
        const r = await pm.sendRequest(q);
        console.log(r.headers.get('content-type'));
      `;
      const translatedCode = translateCode(code);

      expect(translatedCode).toContain('console.log(r.headers.get(\'content-type\'));');
    });

    it('should report a list whose shape no expression recovers', () => {
      const code = `
        const jar = pm.cookies.jar();
        const all = await jar.getAll('https://a.com');
      `;
      const translatedCode = translateCode(code);

      expect(translatedCode).toContain('const all = await jar.getCookies(\'https://a.com\');');
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('getAll (line 3) — Postman yields a PropertyList')
      );
    });
  });

  /**
   * `jar?.get(...)` returns undefined when there is no jar. A plain member expression in
   * its place throws instead, so the optional access has to survive the rename.
   */
  describe('optional access', () => {
    it('should stay optional through a jar rename', () => {
      const code = `
        const jar = pm.cookies.jar();
        jar?.unset('https://a.com', 'sid');
      `;
      expect(translateCode(code)).toContain('jar?.deleteCookie(\'https://a.com\', \'sid\');');
    });

    it('should stay optional through a response rename', () => {
      const code = `
        const r = await pm.sendRequest(q);
        console.log(r?.code);
      `;
      expect(translateCode(code)).toContain('console.log(r?.status);');
    });
  });

  describe('block scope', () => {
    it('types both of two sibling blocks declaring the same name', () => {
      const code = [
        'if (x) { const r = await pm.sendRequest(q); console.log(r.code); }',
        'if (y) { const r = await pm.sendRequest(q2); console.log(r.code); }'
      ].join('\n');

      expect(translateCode(code)).toBe([
        'if (x) { const r = await bru.sendRequest(q); console.log(r.status); }',
        'if (y) { const r = await bru.sendRequest(q2); console.log(r.status); }'
      ].join('\n'));
    });

    it('resolves a shadowed name to the declaration each reference sits in', () => {
      const code = [
        'const r = await pm.sendRequest(req);',
        'console.log(r.code);',
        'if (retry) {',
        '  const r = cached;',
        '  console.log(r.code);',
        '}'
      ].join('\n');

      // the outer reference is the response; the inner one is `cached` and stays as written
      expect(translateCode(code)).toBe([
        'const r = await bru.sendRequest(req);',
        'console.log(r.status);',
        'if (retry) {',
        '  const r = cached;',
        '  console.log(r.code);',
        '}'
      ].join('\n'));
    });

    it('types a binding a nested block shadows only outside that block', () => {
      const code = [
        'const r = other;',
        'if (x) { const r = await pm.sendRequest(q); console.log(r.code); }'
      ].join('\n');

      expect(translateCode(code)).toContain('console.log(r.status)');
    });

    it('drops a var redeclared in the same function', () => {
      const code = ['var r = await pm.sendRequest(q);', 'var r = other;', 'console.log(r.code);'].join('\n');

      expect(translateCode(code)).toContain('console.log(r.code)');
    });

    it('reaches a reference nested inside the declaring block', () => {
      const code = ['const r = await pm.sendRequest(q);', 'if (x) { console.log(r.code); }'].join('\n');

      expect(translateCode(code)).toContain('console.log(r.status)');
    });
  });

  describe('a call whose counterpart is a property', () => {
    it('leaves it alone when it carries arguments', () => {
      const code = ['const r = await pm.sendRequest(q);', 'r.json(reviver);'].join('\n');

      expect(translateCode(code)).toContain('r.json(reviver)');
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('cannot take arguments'));
    });
  });
});
