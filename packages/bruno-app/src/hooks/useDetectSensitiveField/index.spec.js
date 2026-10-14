import { renderHook } from '@testing-library/react';
import { useDetectSensitiveField } from './index';

const secret = (name) => ({ name, value: '', enabled: true, secret: true });
const plain = (name, value) => ({ name, value, enabled: true, secret: false });

describe('useDetectSensitiveField', () => {
  const request = {
    uid: 'request-1',
    type: 'http-request',
    request: {
      vars: {
        req: [plain('token', 'REQUEST_PLAINTEXT')],
        res: []
      }
    }
  };
  const collection = {
    items: [request],
    activeEnvironmentUid: 'env-prod',
    environments: [{ uid: 'env-prod', name: 'Prod', variables: [secret('token')] }],
    root: { request: { vars: { req: [], res: [] } } }
  };

  it('uses the request variable when the field belongs to that request', () => {
    const { result } = renderHook(() => useDetectSensitiveField(collection));

    expect(result.current.isSensitive('Bearer {{token}}', request)).toMatchObject({
      showWarning: true,
      warningMessage: '"token" is a request variable and is stored in plain text. Move it to an environment as a secret.'
    });
  });

  it('keeps a collection field quiet when the value is only a secret environment variable', () => {
    const { result } = renderHook(() => useDetectSensitiveField(collection));

    expect(result.current.isSensitive('{{token}}')).toMatchObject({
      showWarning: false
    });
    expect(result.current.isSensitive('{{token}}', {})).toMatchObject({
      showWarning: false
    });
  });

  it('warns when plaintext surrounds a secret environment variable', () => {
    const { result } = renderHook(() => useDetectSensitiveField(collection));

    expect(result.current.isSensitive('Bearer {{token}}')).toMatchObject({
      showWarning: true,
      warningMessage: 'Store sensitive info as a secret variable or in a .env file'
    });
  });

  it('still warns for a plaintext credential', () => {
    const { result } = renderHook(() => useDetectSensitiveField(collection));

    expect(result.current.isSensitive('abc123', request)).toMatchObject({
      showWarning: true,
      warningMessage: 'Store sensitive info as a secret variable or in a .env file'
    });
  });
});
