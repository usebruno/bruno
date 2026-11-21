import postmanTranslation from '../../../src/postman/postman-translations';
import translateBruToPostman from '../../../src/utils/bruno-to-postman-translator';

/**
 * The two semantic registries (semantic/postman-registry.js and semantic/bruno-registry.js)
 * describe the same member mappings in opposite directions. Nothing else keeps them in step,
 * so a script that survives a full round trip unchanged is what proves they are still inverses.
 */
describe('Script translation round trip', () => {
  const expectStable = (script) => {
    expect(translateBruToPostman(postmanTranslation(script))).toBe(script);
  };

  it('should round trip a response held in an awaited binding', () => {
    expectStable([
      'const response = await pm.sendRequest({ url: "https://echo.usebruno.com/login", method: "POST" });',
      'if (response.code === 200) {',
      '    pm.environment.set("token", response.json().token);',
      '}',
      'pm.test("ok", function () { pm.expect(response.status).to.eql("OK"); });'
    ].join('\n'));
  });

  /**
   * Only the response members are asserted here. The forward pass also makes the callback
   * `async` and awaits the call — correct, because Bruno's sendRequest is promise-based — and
   * the reverse pass does not strip that again. That asymmetry belongs to the sendRequest
   * transformers rather than to the registries this spec guards.
   */
  it('should round trip the members of a response held in a callback parameter', () => {
    const script = [
      'pm.sendRequest({ url: "https://echo.usebruno.com" }, function (err, res) {',
      '    console.log(res.code, res.json());',
      '});'
    ].join('\n');

    expect(translateBruToPostman(postmanTranslation(script))).toContain('console.log(res.code, res.json());');
  });

  it('should round trip a cookie jar held in a variable', () => {
    expectStable([
      'const jar = pm.cookies.jar();',
      'jar.set("https://echo.usebruno.com", "sid", "abc");',
      'jar.getAll("https://echo.usebruno.com");'
    ].join('\n'));
  });
});
