import axios from 'axios';
import { fetchOpenIDConfiguration } from './oidcDiscovery';

const SAMPLE_METADATA = {
  issuer: 'https://op.example.com',
  authorization_endpoint: 'https://op.example.com/authorize',
  token_endpoint: 'https://op.example.com/token',
  pushed_authorization_request_endpoint: 'https://op.example.com/par',
  jwks_uri: 'https://op.example.com/jwks',
  userinfo_endpoint: 'https://op.example.com/userinfo',
  end_session_endpoint: 'https://op.example.com/logout',
  response_types_supported: ['code', 'code id_token'],
  token_endpoint_auth_methods_supported: ['client_secret_basic', 'private_key_jwt'],
  request_object_signing_alg_values_supported: ['RS256', 'PS256', 'ES256']
};

describe('fetchOpenIDConfiguration', () => {
  it('GETs {issuer}/.well-known/openid-configuration and returns the parsed metadata', async () => {
    const calls: string[] = [];
    const fakeAxios: any = (config: any) => {
      calls.push(config.url);
      return Promise.resolve({ data: SAMPLE_METADATA });
    };
    const metadata = await fetchOpenIDConfiguration('https://op.example.com', fakeAxios);
    expect(calls).toEqual(['https://op.example.com/.well-known/openid-configuration']);
    expect(metadata.issuer).toBe('https://op.example.com');
    expect(metadata.token_endpoint).toBe('https://op.example.com/token');
    expect(metadata.pushed_authorization_request_endpoint).toBe('https://op.example.com/par');
  });

  it('normalises a trailing slash on the issuer URL', async () => {
    const calls: string[] = [];
    const fakeAxios: any = (config: any) => {
      calls.push(config.url);
      return Promise.resolve({ data: SAMPLE_METADATA });
    };
    await fetchOpenIDConfiguration('https://op.example.com/', fakeAxios);
    expect(calls[0]).toBe('https://op.example.com/.well-known/openid-configuration');
  });

  it('normalises multiple trailing slashes', async () => {
    const calls: string[] = [];
    const fakeAxios: any = (config: any) => {
      calls.push(config.url);
      return Promise.resolve({ data: SAMPLE_METADATA });
    };
    await fetchOpenIDConfiguration('https://op.example.com/realms/r1///', fakeAxios);
    expect(calls[0]).toBe('https://op.example.com/realms/r1/.well-known/openid-configuration');
  });

  it('throws when the response is missing the `issuer` claim', async () => {
    const fakeAxios: any = () => Promise.resolve({ data: { token_endpoint: 'https://op/token' } });
    await expect(fetchOpenIDConfiguration('https://op.example.com', fakeAxios)).rejects.toThrow(/not a valid OP metadata/);
  });

  it('throws when issuer URL is empty', async () => {
    await expect(fetchOpenIDConfiguration('', undefined)).rejects.toThrow(/non-empty issuer URL/);
  });
});
