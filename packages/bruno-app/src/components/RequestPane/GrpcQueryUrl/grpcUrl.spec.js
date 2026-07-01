import {
  isLocalGrpcHost,
  startsWithVariable,
  hasExplicitGrpcScheme,
  isSecureGrpcUrl,
  getDisplayGrpcUrl,
  setGrpcUrlSecureScheme,
  resolveSecureForInput
} from './grpcUrl';

describe('grpcUrl helpers', () => {
  describe('isLocalGrpcHost', () => {
    it('detects localhost and loopback addresses', () => {
      expect(isLocalGrpcHost('localhost:50051')).toBe(true);
      expect(isLocalGrpcHost('grpc://127.0.0.1:50051')).toBe(true);
      expect(isLocalGrpcHost('LOCALHOST:9090')).toBe(true);
    });

    it('treats remote hosts as non-local', () => {
      expect(isLocalGrpcHost('api.example.com:443')).toBe(false);
      expect(isLocalGrpcHost('')).toBe(false);
    });
  });

  describe('startsWithVariable', () => {
    it('is true only when the url begins with a variable', () => {
      expect(startsWithVariable('{{baseUrl}}')).toBe(true);
      expect(startsWithVariable('  {{baseUrl}}/svc')).toBe(true);
      expect(startsWithVariable('grpcs://{{host}}')).toBe(false);
      expect(startsWithVariable('example.com')).toBe(false);
    });
  });

  describe('hasExplicitGrpcScheme', () => {
    it('recognizes grpc/grpcs/http/https schemes', () => {
      expect(hasExplicitGrpcScheme('grpc://x')).toBe(true);
      expect(hasExplicitGrpcScheme('grpcs://x')).toBe(true);
      expect(hasExplicitGrpcScheme('http://x')).toBe(true);
      expect(hasExplicitGrpcScheme('https://x')).toBe(true);
      expect(hasExplicitGrpcScheme('example.com')).toBe(false);
      expect(hasExplicitGrpcScheme('{{baseUrl}}')).toBe(false);
    });
  });

  describe('isSecureGrpcUrl', () => {
    it('honors an explicit scheme', () => {
      expect(isSecureGrpcUrl('grpcs://example.com')).toBe(true);
      expect(isSecureGrpcUrl('https://example.com')).toBe(true);
      expect(isSecureGrpcUrl('grpc://example.com')).toBe(false);
      expect(isSecureGrpcUrl('http://example.com')).toBe(false);
    });

    it('mirrors the backend host default when no scheme is present', () => {
      expect(isSecureGrpcUrl('example.com:443')).toBe(true);
      expect(isSecureGrpcUrl('localhost:50051')).toBe(false);
      expect(isSecureGrpcUrl('127.0.0.1:50051')).toBe(false);
    });

    it('returns false for empty or variable-leading urls', () => {
      expect(isSecureGrpcUrl('')).toBe(false);
      expect(isSecureGrpcUrl('{{baseUrl}}')).toBe(false);
    });
  });

  describe('getDisplayGrpcUrl', () => {
    it('strips grpc/grpcs schemes for display', () => {
      expect(getDisplayGrpcUrl('grpc://localhost:50051')).toBe('localhost:50051');
      expect(getDisplayGrpcUrl('grpcs://example.com')).toBe('example.com');
    });

    it('leaves scheme-less and variable urls untouched', () => {
      expect(getDisplayGrpcUrl('example.com')).toBe('example.com');
      expect(getDisplayGrpcUrl('{{baseUrl}}')).toBe('{{baseUrl}}');
    });
  });

  describe('setGrpcUrlSecureScheme', () => {
    it('adds the chosen scheme to a scheme-less url', () => {
      expect(setGrpcUrlSecureScheme('example.com', true)).toBe('grpcs://example.com');
      expect(setGrpcUrlSecureScheme('example.com', false)).toBe('grpc://example.com');
    });

    it('replaces an existing scheme', () => {
      expect(setGrpcUrlSecureScheme('grpc://example.com', true)).toBe('grpcs://example.com');
      expect(setGrpcUrlSecureScheme('https://example.com', false)).toBe('grpc://example.com');
    });

    it('returns the bare scheme for an empty url', () => {
      expect(setGrpcUrlSecureScheme('', true)).toBe('grpcs://');
      expect(setGrpcUrlSecureScheme('', false)).toBe('grpc://');
    });

    it('prepends the scheme onto a variable-leading url', () => {
      expect(setGrpcUrlSecureScheme('{{baseUrl}}', true)).toBe('grpcs://{{baseUrl}}');
      expect(setGrpcUrlSecureScheme('{{baseUrl}}/svc', false)).toBe('grpc://{{baseUrl}}/svc');
    });

    it('replaces a leading scheme even when the host is a variable', () => {
      expect(setGrpcUrlSecureScheme('grpc://{{baseUrl}}', true)).toBe('grpcs://{{baseUrl}}');
      expect(setGrpcUrlSecureScheme('grpcs://{{baseUrl}}', false)).toBe('grpc://{{baseUrl}}');
    });
  });

  describe('resolveSecureForInput', () => {
    it('honors a scheme typed/pasted in the new value', () => {
      expect(resolveSecureForInput('grpc://old', 'grpcs://new')).toBe(true);
      expect(resolveSecureForInput('grpcs://old', 'grpc://new')).toBe(false);
    });

    it('preserves the previously chosen scheme when the value has none', () => {
      expect(resolveSecureForInput('grpcs://example.com', 'example.com')).toBe(true);
      expect(resolveSecureForInput('grpc://localhost', 'localhost:1')).toBe(false);
    });

    it('infers from the host when neither side has a scheme', () => {
      expect(resolveSecureForInput('', 'example.com:443')).toBe(true);
      expect(resolveSecureForInput('', 'localhost:50051')).toBe(false);
    });
  });
});
