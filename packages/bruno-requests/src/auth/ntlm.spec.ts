import { isNtlmAuthHeader, handleNtlmRedirect } from './ntlm';

describe('isNtlmAuthHeader', () => {
  it.each(['NTLM TlRMTVNTUAAD', 'ntlm TlRMTVNTUAAD', '  NTLM TlRMTVNTUAAD'])(
    'recognises %s as a credential bound to the connection it was negotiated on',
    (header) => {
      expect(isNtlmAuthHeader(header)).toBe(true);
    }
  );

  it.each(['Bearer abc', 'Basic dXNlcjpwYXNz', 'Negotiate YIIF', 'AWS4-HMAC-SHA256 Credential=abc', 'NTLMish token', '', undefined, null, 42])(
    'leaves %s alone',
    (header) => {
      expect(isNtlmAuthHeader(header)).toBe(false);
    }
  );
});

describe('handleNtlmRedirect', () => {
  const ntlmHeaders = { 'Authorization': 'NTLM TlRMTVNTUAAD', 'X-retry': 'false', 'Accept': '*/*' };

  it('drops the finished message, X-retry and the adapter when the redirect stays on the origin', () => {
    const requestConfig = { headers: { ...ntlmHeaders }, adapter: 'ntlm' };

    handleNtlmRedirect(requestConfig, 'https://a.test/x', 'https://a.test/y', false);

    expect(requestConfig.headers).toEqual({ Accept: '*/*' });
    expect(requestConfig.adapter).toBeUndefined();
  });

  it('drops the finished message but keeps the adapter when the redirect goes to another host', () => {
    const requestConfig = { headers: { ...ntlmHeaders }, adapter: 'ntlm' };

    handleNtlmRedirect(requestConfig, 'https://a.test/x', 'https://b.test/y', false);

    expect(requestConfig.headers).toEqual({ Accept: '*/*' });
    expect(requestConfig.adapter).toBe('ntlm');
  });

  it('drops the adapter for another host too when the request forwards Authorization on redirect', () => {
    const requestConfig = { headers: { ...ntlmHeaders }, adapter: 'ntlm' };

    handleNtlmRedirect(requestConfig, 'https://a.test/x', 'https://b.test/y', true);

    expect(requestConfig.headers).toEqual({ Accept: '*/*' });
    expect(requestConfig.adapter).toBeUndefined();
  });

  it('leaves a request that carries any other credential alone', () => {
    const requestConfig = { headers: { 'Authorization': 'Bearer abc', 'X-retry': 'false' }, adapter: 'ntlm' };

    handleNtlmRedirect(requestConfig, 'https://a.test/x', 'https://a.test/y', true);

    expect(requestConfig.headers).toEqual({ 'Authorization': 'Bearer abc', 'X-retry': 'false' });
    expect(requestConfig.adapter).toBe('ntlm');
  });
});
