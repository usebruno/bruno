import { parseError, formatIpcError, formatOauth2Error, BrunoError } from './error';

describe('error utils', () => {
  describe('parseError', () => {
    it('should return error message for standard Error', () => {
      expect(parseError(new Error('Network error'))).toBe('Network error');
    });

    it('should return error message for BrunoError', () => {
      expect(parseError(new BrunoError('Custom warning', 'warning'))).toBe('Custom warning');
    });

    it('should return string directly if error is a string', () => {
      expect(parseError('Simple error string')).toBe('Simple error string');
    });

    it('should extract message from error object (like .NET exception)', () => {
      const netError = {
        targetSite: 'Void CheckCredentials()',
        message: 'Invalid client credentials',
        data: {},
        innerException: null
      };
      expect(parseError(netError)).toBe('Invalid client credentials');
    });

    it('should extract error_description from OAuth2 error object', () => {
      const oauthError = {
        error: 'invalid_client',
        error_description: 'Client authentication failed'
      };
      expect(parseError(oauthError)).toBe('invalid_client: Client authentication failed');
    });

    it('should safely stringify arbitrary error objects without message', () => {
      const customObj = { code: 401, status: 'unauthorized' };
      expect(parseError(customObj)).toBe(JSON.stringify(customObj, null, 2));
    });

    it('should return default error message for null or undefined', () => {
      expect(parseError(null)).toBe('An error occurred');
      expect(parseError(undefined, 'Fallback')).toBe('Fallback');
    });
  });

  describe('formatIpcError', () => {
    it('should strip Electron IPC remote method prefix from Error', () => {
      const err = new Error('Error invoking remote method \'renderer:fetch-oauth2-credentials\': Connection refused');
      expect(formatIpcError(err)).toBe('Connection refused');
    });

    it('should strip Electron IPC remote method prefix with Error: tag', () => {
      const err = new Error('Error invoking remote method \'send-http-request\': Error: Timeout reached');
      expect(formatIpcError(err)).toBe('Timeout reached');
    });

    it('should strip prefix from plain string error', () => {
      const str = 'Error invoking remote method \'renderer:run-action\': Action failed';
      expect(formatIpcError(str)).toBe('Action failed');
    });

    it('should handle plain object without returning object (preventing React child error #31)', () => {
      const objError = {
        targetSite: 'Test',
        message: 'Error invoking remote method \'api\': Failed to resolve'
      };
      const result = formatIpcError(objError);
      expect(typeof result).toBe('string');
      expect(result).toBe('Failed to resolve');
    });

    it('should return empty string for null or undefined', () => {
      expect(formatIpcError(null)).toBe('');
      expect(formatIpcError(undefined)).toBe('');
    });
  });

  describe('formatOauth2Error', () => {
    it('should return default message when result is null or empty', () => {
      expect(formatOauth2Error(null)).toBe('No access token received from authorization server');
      expect(formatOauth2Error({})).toBe('No access token received from authorization server');
    });

    it('should return string directly if result is a string', () => {
      expect(formatOauth2Error('Server error 500')).toBe('Server error 500');
    });

    it('should format standard OAuth2 error with description', () => {
      const res = {
        error: 'invalid_grant',
        error_description: 'The provided authorization grant is invalid, expired, or revoked'
      };
      expect(formatOauth2Error(res)).toBe('invalid_grant: The provided authorization grant is invalid, expired, or revoked');
    });

    it('should format OAuth2 error when error is a string and description is missing', () => {
      const res = { error: 'unauthorized_client' };
      expect(formatOauth2Error(res)).toBe('unauthorized_client');
    });

    it('should handle nested error object with message (e.g., .NET / backend exception)', () => {
      const res = {
        error: {
          targetSite: '...',
          message: 'Client credentials mismatch',
          data: {}
        }
      };
      expect(formatOauth2Error(res)).toBe('Client credentials mismatch');
    });

    it('should handle response where message is top-level (.NET / Spring Boot error payload)', () => {
      const res = {
        targetSite: 'System.Web.Security',
        message: 'The client secret provided does not match.',
        innerException: null,
        stackTrace: 'at ...'
      };
      expect(formatOauth2Error(res)).toBe('The client secret provided does not match.');
    });

    it('should always return a string and never an object (preventing React crash #31)', () => {
      const res = {
        hResult: -2146233088,
        details: { code: 'ERR_AUTH' }
      };
      const formatted = formatOauth2Error(res);
      expect(typeof formatted).toBe('string');
      expect(formatted).toBe(JSON.stringify(res, null, 2));
    });
  });
});
