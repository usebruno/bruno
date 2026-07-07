const bruToJson = require('../src/bruToJson');
const jsonToBru = require('../src/jsonToBru');

describe('app block', () => {
  const appBruEnabled = `app {
  enabled: true
  code: '''
    <div>hello</div>
  '''
}
`;

  const appBruDisabled = `app {
  code: '''
    <div>hello</div>
  '''
}
`;

  it('should parse an app block without enabled as disabled', () => {
    const output = bruToJson(appBruDisabled);
    expect(output.app).toEqual({ code: '<div>hello</div>', enabled: false });
  });

  it('should parse enabled: true', () => {
    const output = bruToJson(appBruEnabled);
    expect(output.app).toEqual({ code: '<div>hello</div>', enabled: true });
  });

  it('should stringify enabled only when enabled', () => {
    expect(jsonToBru({ app: { code: '<div>hello</div>', enabled: true } })).toEqual(appBruEnabled);
    expect(jsonToBru({ app: { code: '<div>hello</div>', enabled: false } })).toEqual(appBruDisabled);
  });

  it('should round-trip the enabled flag', () => {
    expect(bruToJson(jsonToBru({ app: { code: '<x/>', enabled: true } })).app.enabled).toBe(true);
    expect(bruToJson(jsonToBru({ app: { code: '<x/>', enabled: false } })).app.enabled).toBe(false);
  });

  it('should parse enableApp in the settings block', () => {
    const output = bruToJson(`settings {\n  encodeUrl: true\n  enableApp: true\n}\n`);
    expect(output.settings.enableApp).toBe(true);
  });
});
