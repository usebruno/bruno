import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { addDigestInterceptor } from '../../src/auth/digestauth-helper';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const mockAxios = new MockAdapter(axios as any);

const realm = 'test-realm';
const nonce = 'test-nonce';
const request = {
  digestConfig: {
    username: 'test-user',
    password: 'test-pass',
  },
  url: '/test',
  method: 'GET'
};

jest.mock('crypto', () => {
  return {
    createHash: (algorithm: String) => ({
      update: (input: String) => ({
        digest: (encoding : String) =>
          `hash(${algorithm}//${input})`
      })
    }),
    randomBytes: (size: Number) => ({
      toString: (encoding: String) =>
        'rnd'
    })
  }
});

describe('addDigestInterceptor', () => {

  beforeEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
    mockAxios.resetHistory();
  });

  it('should initialize the Digest Auth Interceptor', () => {
    const axiosInstance = {
      interceptors: {
        response: {
          use: jest.fn()
        }
      }
    };
    const request = {
      digestConfig: {
        username: 'test-user',
        password: 'test-pass',
      }
    };
    addDigestInterceptor(axiosInstance, request);

    expect(axiosInstance.interceptors.response.use).toHaveBeenCalled();
  });

  it.each([
    ['MD5', 'hash(md5//hash(md5//test-user:test-realm:test-pass):test-nonce:00000001:rnd:auth:hash(md5//GET:/test))' ],
    ['MD5-sess', 'hash(md5//hash(md5//hash(md5//test-user:test-realm:test-pass):test-nonce:rnd):test-nonce:00000001:rnd:auth:hash(md5//GET:/test))' ],
    ['SHA-256', 'hash(sha256//hash(sha256//test-user:test-realm:test-pass):test-nonce:00000001:rnd:auth:hash(sha256//GET:/test))' ],
    ['SHA-256-sess', 'hash(sha256//hash(sha256//hash(sha256//test-user:test-realm:test-pass):test-nonce:rnd):test-nonce:00000001:rnd:auth:hash(sha256//GET:/test))' ],
    ['SHA-512-256', 'hash(sha512-256//hash(sha512-256//test-user:test-realm:test-pass):test-nonce:00000001:rnd:auth:hash(sha512-256//GET:/test))' ],
    ['SHA-512-256-sess', 'hash(sha512-256//hash(sha512-256//hash(sha512-256//test-user:test-realm:test-pass):test-nonce:rnd):test-nonce:00000001:rnd:auth:hash(sha512-256//GET:/test))' ]
  ])('should handle %s algorithm in Digest challenge', async (algorithm, expectedChallengeResponse) => {
    mockAxios.onGet(request.url)
      .replyOnce(401, 'Unauthorized', {
        'www-authenticate': `Digest realm="${realm}", nonce="${nonce}", algorithm="${algorithm}", qop="auth"`
      })
      .onGet(request.url)
      .replyOnce(200);

    const axiosInstance = axios.create();
    addDigestInterceptor(
      axiosInstance,
      request
    );
    await axiosInstance(request);

    expect(mockAxios.history.get.length).toBe(2);
    expect(mockAxios.history.get[1].headers).toMatchObject({
      Authorization: `Digest username="${request.digestConfig.username}", realm="${realm}", nonce="${nonce}", uri="${request.url}", qop="auth", algorithm="${algorithm}", response="${expectedChallengeResponse}", nc="00000001", cnonce="rnd"`
    });
  });

  it('should reject if the Digest algorithm is unsupported', async () => {
    mockAxios.onGet(request.url)
      .replyOnce(401, 'Unauthorized', {
        'www-authenticate': `Digest realm="${realm}", nonce="${nonce}", algorithm="UNKNOWN", qop="auth"`
      });

    const axiosInstance = axios.create();
    addDigestInterceptor(
      axiosInstance,
      request
    );
    const axiosResult = axiosInstance(request);

    await expect(axiosResult).rejects.toBeDefined();
  });
});