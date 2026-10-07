const {
  registerOauth2AuthorizationRequest,
  handleOauth2ProtocolUrl,
  cancelOAuth2AuthorizationRequest,
  isOauth2AuthorizationRequestInProgress
} = require('../../src/utils/oauth2-protocol-handler');

describe('handleOauth2ProtocolUrl - state validation', () => {
  let resolve;
  let reject;

  beforeEach(() => {
    resolve = jest.fn();
    reject = jest.fn();
  });

  afterEach(() => {
    // Clear any pending request between tests
    if (isOauth2AuthorizationRequestInProgress()) {
      cancelOAuth2AuthorizationRequest();
    }
    jest.clearAllMocks();
  });

  describe('authorization code flow (state in query params)', () => {
    it('should resolve with the code when the returned state matches', () => {
      registerOauth2AuthorizationRequest(resolve, reject, null, 'expected-state');

      handleOauth2ProtocolUrl('bruno://app/oauth2/callback?code=auth-code-123&state=expected-state');

      expect(resolve).toHaveBeenCalledWith('auth-code-123');
      expect(reject).not.toHaveBeenCalled();
    });

    it('should reject when the returned state does not match', () => {
      registerOauth2AuthorizationRequest(resolve, reject, null, 'expected-state');

      handleOauth2ProtocolUrl('bruno://app/oauth2/callback?code=auth-code-123&state=attacker-state');

      expect(resolve).not.toHaveBeenCalled();
      expect(reject).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('state mismatch') })
      );
    });

    it('should reject when no state is returned but one was expected', () => {
      registerOauth2AuthorizationRequest(resolve, reject, null, 'expected-state');

      handleOauth2ProtocolUrl('bruno://app/oauth2/callback?code=auth-code-123');

      expect(resolve).not.toHaveBeenCalled();
      expect(reject).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('state mismatch') })
      );
    });
  });

  describe('implicit flow (state in hash fragment)', () => {
    it('should resolve with tokens when the returned state matches', () => {
      registerOauth2AuthorizationRequest(resolve, reject, null, 'expected-state');

      handleOauth2ProtocolUrl(
        'bruno://app/oauth2/callback#access_token=token-abc&token_type=bearer&state=expected-state'
      );

      expect(resolve).toHaveBeenCalledWith(
        expect.objectContaining({ access_token: 'token-abc' })
      );
      expect(reject).not.toHaveBeenCalled();
    });

    it('should reject when the hash state does not match', () => {
      registerOauth2AuthorizationRequest(resolve, reject, null, 'expected-state');

      handleOauth2ProtocolUrl(
        'bruno://app/oauth2/callback#access_token=token-abc&token_type=bearer&state=attacker-state'
      );

      expect(resolve).not.toHaveBeenCalled();
      expect(reject).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('state mismatch') })
      );
    });

    it('should reject when no hash state is returned but one was expected', () => {
      registerOauth2AuthorizationRequest(resolve, reject, null, 'expected-state');

      handleOauth2ProtocolUrl(
        'bruno://app/oauth2/callback#access_token=token-abc&token_type=bearer'
      );

      expect(resolve).not.toHaveBeenCalled();
      expect(reject).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('state mismatch') })
      );
    });
  });

  describe('when no expected state was registered', () => {
    it('should reject rather than resolve without state (fail closed)', () => {
      registerOauth2AuthorizationRequest(resolve, reject, null, null);

      handleOauth2ProtocolUrl('bruno://app/oauth2/callback?code=auth-code-123');

      expect(resolve).not.toHaveBeenCalled();
      expect(reject).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('state mismatch') })
      );
    });
  });

  describe('error responses are handled before state validation', () => {
    it('should reject with the provider error even if state is absent', () => {
      registerOauth2AuthorizationRequest(resolve, reject, null, 'expected-state');

      handleOauth2ProtocolUrl('bruno://app/oauth2/callback?error=access_denied');

      expect(resolve).not.toHaveBeenCalled();
      expect(reject).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Authorization Failed') })
      );
    });

    it('should reject with the provider error in the hash fragment even if state is absent', () => {
      registerOauth2AuthorizationRequest(resolve, reject, null, 'expected-state');

      handleOauth2ProtocolUrl('bruno://app/oauth2/callback#error=access_denied');

      expect(resolve).not.toHaveBeenCalled();
      expect(reject).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Authorization Failed') })
      );
    });
  });
});
