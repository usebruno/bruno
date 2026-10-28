import axios from 'axios';
import { addAwsV4Interceptor } from './awsv4-helper';

const credentials = { accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'secret', region: 'us-east-1', service: 'execute-api' };

const captureRequestConfig = async (instance: ReturnType<typeof axios.create>, extra: Record<string, unknown> = {}) => {
  let captured: any;
  instance.defaults.adapter = async (config: any) => {
    captured = config;
    return { data: '', status: 200, statusText: 'OK', headers: {}, config };
  };
  await instance.request({ url: 'https://example.amazonaws.com/path', method: 'GET', ...extra });
  return captured;
};

describe('addAwsV4Interceptor', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('signs requests with an AWS4-HMAC-SHA256 Authorization header', async () => {
    const instance = axios.create();
    addAwsV4Interceptor(instance, { awsv4config: credentials });

    const config = await captureRequestConfig(instance);

    expect(String(config.headers.Authorization)).toMatch(/^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/\d{8}\/us-east-1\/execute-api\/aws4_request/);
  });

  it('skips signing when the request config sets __skipAwsV4Sign', async () => {
    const instance = axios.create();
    addAwsV4Interceptor(instance, { awsv4config: credentials });

    const config = await captureRequestConfig(instance, { __skipAwsV4Sign: true });

    expect(config.headers.Authorization).toBeUndefined();
  });

  it('does not register an interceptor when credentials are missing', () => {
    const instance = axios.create();
    const useSpy = jest.spyOn(instance.interceptors.request, 'use');

    addAwsV4Interceptor(instance, {});
    addAwsV4Interceptor(instance, { awsv4config: { accessKeyId: 'undefined', secretAccessKey: 'secret' } });

    expect(useSpy).not.toHaveBeenCalled();
  });
});
