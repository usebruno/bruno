const { executeRequestOnFailHandler } = require('../../src/ipc/network/index');

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
    
    await expect(executeRequestOnFailHandler(request, error)).rejects.toThrow('An error occurred in on-fail handler');
    
    expect(mockHandler).toHaveBeenCalledWith(error);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should pass the correct error object to the handler', async () => {
    const mockHandler = jest.fn();
    const request = { onFailHandler: mockHandler };
    const error = new Error('Specific test error');
    error.status = 404;
    error.response = { data: 'Not found' };
    
    await executeRequestOnFailHandler(request, error);
    
    expect(mockHandler).toHaveBeenCalledWith(error);
    const passedError = mockHandler.mock.calls[0][0];
    expect(passedError.message).toBe('Specific test error');
    expect(passedError.status).toBe(404);
    expect(passedError.response).toEqual({ data: 'Not found' });
  });
}); 