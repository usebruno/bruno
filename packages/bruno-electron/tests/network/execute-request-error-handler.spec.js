const { executeRequestOnFailHandler } = require('../../src/ipc/network/index');
const axios = require('axios');

describe('executeRequestOnFailHandler', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should do nothing when request is null', async () => {
    const error = new Error('Test error');
    
    await executeRequestOnFailHandler(null, error);
    
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should do nothing when request is undefined', async () => {
    const error = new Error('Test error');
    
    await executeRequestOnFailHandler(undefined, error);
    
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should do nothing when onFailHandler is not a function', async () => {
    const request = { onFailHandler: 'not a function' };
    const error = new Error('Test error');
    
    await executeRequestOnFailHandler(request, error);
    
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should call onFailHandler when it exists and is a function', async () => {
    const mockHandler = jest.fn();
    const request = { onFailHandler: mockHandler };
    const error = new Error('Test error');
    
    await executeRequestOnFailHandler(request, error);
    
    expect(mockHandler).toHaveBeenCalledWith(error);
    expect(mockHandler).toHaveBeenCalledTimes(1);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should catch and throw errors when onFailHandler fails', async () => {
    const handlerError = new Error('Handler failed');
    const mockHandler = jest.fn(() => {
      throw handlerError;
    });
    const request = { onFailHandler: mockHandler };
    const error = new Error('Original error');
    
    await expect(executeRequestOnFailHandler(request, error)).rejects.toThrow(handlerError);
    
    expect(mockHandler).toHaveBeenCalledWith(error);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should pass the correct hard error object to the handler for DNS failure', async () => {
    const mockHandler = jest.fn();
    const request = { onFailHandler: mockHandler };
    
    let error;
    try {
      await axios.get('https://this-domain-definitely-does-not-exist-12345.com/api/test', {
        timeout: 5000
      });
    } catch (err) {
      error = err;
    }
    
    // Verify this is actually a hard error (no response)
    expect(error.response).toBeUndefined();
    
    await executeRequestOnFailHandler(request, error);
    
    expect(mockHandler).toHaveBeenCalledWith(error);
    expect(error.message).toContain('ENOTFOUND'); // DNS resolution failed
  });

  it('should pass the correct hard error object to the handler for connection timeout', async () => {
    const mockHandler = jest.fn();
    const request = { onFailHandler: mockHandler };

    let error;
    try {
      await axios.get('http://192.168.255.255:9999/api/test', {
        timeout: 100
      });
    } catch (err) {
      error = err;
    }
    
    // Verify this is actually a hard error (no response)
    expect(error.response).toBeUndefined();
    
    await executeRequestOnFailHandler(request, error);
    
    expect(mockHandler).toHaveBeenCalledWith(error);
    const passedError = mockHandler.mock.calls[0][0];
    expect(passedError.response).toBeUndefined(); // Should be undefined for hard errors
    expect(passedError.code).toBe('ECONNABORTED'); // Connection aborted due to timeout
  });
}); 