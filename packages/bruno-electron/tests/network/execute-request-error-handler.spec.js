const { executeRequestOnErrorHandler } = require('../../src/ipc/network/index');

describe('executeRequestOnErrorHandler', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should do nothing when request is null', async () => {
    const error = new Error('Test error');
    
    await executeRequestOnErrorHandler(null, error);
    
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should do nothing when request is undefined', async () => {
    const error = new Error('Test error');
    
    await executeRequestOnErrorHandler(undefined, error);
    
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should do nothing when onErrorHandler is not a function', async () => {
    const request = { onErrorHandler: 'not a function' };
    const error = new Error('Test error');
    
    await executeRequestOnErrorHandler(request, error);
    
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should call onErrorHandler when it exists and is a function', async () => {
    const mockHandler = jest.fn();
    const request = { onErrorHandler: mockHandler };
    const error = new Error('Test error');
    
    await executeRequestOnErrorHandler(request, error);
    
    expect(mockHandler).toHaveBeenCalledWith(error);
    expect(mockHandler).toHaveBeenCalledTimes(1);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should catch and log errors thrown by onErrorHandler', async () => {
    const handlerError = new Error('Handler failed');
    const mockHandler = jest.fn(() => {
      throw handlerError;
    });
    const request = { onErrorHandler: mockHandler };
    const error = new Error('Original error');
    
    await executeRequestOnErrorHandler(request, error);
    
    expect(mockHandler).toHaveBeenCalledWith(error);
    expect(consoleSpy).toHaveBeenCalledWith('Error executing on-error handler:', handlerError);
  });

  it('should pass the correct error object to the handler', async () => {
    const mockHandler = jest.fn();
    const request = { onErrorHandler: mockHandler };
    const error = new Error('Specific test error');
    error.status = 404;
    error.response = { data: 'Not found' };
    
    await executeRequestOnErrorHandler(request, error);
    
    expect(mockHandler).toHaveBeenCalledWith(error);
    const passedError = mockHandler.mock.calls[0][0];
    expect(passedError.message).toBe('Specific test error');
    expect(passedError.status).toBe(404);
    expect(passedError.response).toEqual({ data: 'Not found' });
  });
}); 