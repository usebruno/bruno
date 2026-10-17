import { signEdgeGridRequest } from './edgegrid';

/**
 * Akamai's OFFICIAL EdgeGrid vectors (github.com/akamai/AkamaiOPEN-edgegrid-node). Matching them
 * byte-for-byte proves the Web Crypto signer here produces the same signature as the Node runtime
 * signer, so Generate Code snippets validate against the real gateway.
 */
const CREDS = {
  clientToken: 'akab-client-token-xxx-xxxxxxxxxxxxxxxx',
  accessToken: 'akab-access-token-xxx-xxxxxxxxxxxxxxxx',
  clientSecret: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx=',
  nonce: 'nonce-xx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  timestamp: '20140321T19:34:21+0000'
};
const HOST = 'https://akaa-baseurl-xxxxxxxxxxx-xxxxxxxxxxxxx.luna.akamaiapis.net';

const sig = (header: string | null) => (header || '').split('signature=')[1];

describe('signEdgeGridRequest (codegen) - Akamai official vectors', () => {
  const cases = [
    { name: 'simple GET', request: { method: 'GET', url: `${HOST}/` }, expected: 'tL+y4hxyHxgWVD30X3pWnGKHcPzmrIF+LThiAOhMxYU=' },
    { name: 'GET with query string', request: { method: 'GET', url: `${HOST}/testapi/v1/t1?p1=1&p2=2` }, expected: 'hKDH1UlnQySSHjvIcZpDMbQHihTQ0XyVAKZaApabdeA=' },
    { name: 'POST within body limit', request: { method: 'POST', url: `${HOST}/testapi/v1/t3`, bodyText: 'datadatadatadatadatadatadatadata' }, expected: 'hXm4iCxtpN22m4cbZb4lVLW5rhX8Ca82vCFqXzSTPe4=' },
    { name: 'POST with empty body', request: { method: 'POST', url: `${HOST}/testapi/v1/t6`, bodyText: '' }, expected: '1gEDxeQGD5GovIkJJGcBaKnZ+VaPtrc4qBUHixjsPCQ=' }
  ];

  test.each(cases)('$name', async ({ request, expected }) => {
    expect(sig(await signEdgeGridRequest(CREDS, request))).toBe(expected);
  });

  it('returns null when required credentials are missing (caller omits the header)', async () => {
    expect(await signEdgeGridRequest({ ...CREDS, clientSecret: '' }, { method: 'GET', url: `${HOST}/` })).toBeNull();
  });

  it('emits a placeholder signature when credentials are unresolved {{var}} (interpolation off)', async () => {
    const header = await signEdgeGridRequest(
      { ...CREDS, clientToken: '{{client_token}}', clientSecret: '{{client_secret}}' },
      { method: 'POST', url: `${HOST}/edgegrid/verify` }
    );
    expect(header).toContain('client_token={{client_token}}');
    expect(sig(header)).toBe('<computed-at-request-time>');
  });
});
