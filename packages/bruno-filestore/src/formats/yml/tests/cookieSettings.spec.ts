import parseItem from '../parseItem';
import stringifyItem from '../stringifyItem';

describe('YAML per-request cookie settings', () => {
  it.each([
    ['http', 'http:\n  method: GET\n  url: https://example.com'],
    ['graphql', 'graphql:\n  method: POST\n  url: https://example.com/graphql']
  ])('round-trips cookie settings for %s requests', (type, requestBlock) => {
    const yml = `info:
  name: Cookie Settings
  type: ${type}
  seq: 1

${requestBlock}

settings:
  storeCookies: false
  sendCookies: false
`;

    const item = parseItem(yml);

    expect(item.settings).toMatchObject({
      storeCookies: false,
      sendCookies: false
    });

    const output = stringifyItem(item);
    expect(output).toContain('storeCookies: false');
    expect(output).toContain('sendCookies: false');
  });
});
