const BrunoRequest = require('../src/bruno-request');

describe('BrunoRequest', () => {
  const createRequest = (overrides = {}) => {
    return new BrunoRequest({
      url: 'https://api.example.com/users',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token123',
        'X-Custom-Header': 'custom-value'
      },
      timeout: 5000,
      name: 'Test Request',
      ...overrides
    });
  };

  describe('getHeader', () => {
    it('should return the value of an existing header', () => {
      const req = createRequest();
      expect(req.getHeader('Content-Type')).toBe('application/json');
    });

    it('should return the value of the Authorization header', () => {
      const req = createRequest();
      expect(req.getHeader('Authorization')).toBe('Bearer token123');
    });

    it('should return undefined for a non-existing header', () => {
      const req = createRequest();
      expect(req.getHeader('X-Non-Existent')).toBeUndefined();
    });
  });

  describe('getHeaders', () => {
    it('should return all headers', () => {
      const req = createRequest();
      const headers = req.getHeaders();
      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token123',
        'X-Custom-Header': 'custom-value'
      });
    });

    it('should return an empty object when no headers are set', () => {
      const req = createRequest({ headers: {} });
      expect(req.getHeaders()).toEqual({});
    });
  });

  describe('deleteHeader', () => {
    it('should delete a single header by name', () => {
      const req = createRequest();
      req.deleteHeader('Authorization');
      expect(req.getHeader('Authorization')).toBeUndefined();
    });

    it('should not affect other headers when deleting one', () => {
      const req = createRequest();
      req.deleteHeader('Authorization');
      expect(req.getHeader('Content-Type')).toBe('application/json');
      expect(req.getHeader('X-Custom-Header')).toBe('custom-value');
    });

    it('should not throw when deleting a non-existing header', () => {
      const req = createRequest();
      expect(() => req.deleteHeader('X-Non-Existent')).not.toThrow();
    });

    it('should make the header unavailable via getHeaders after deletion', () => {
      const req = createRequest();
      req.deleteHeader('X-Custom-Header');
      const headers = req.getHeaders();
      expect(headers).not.toHaveProperty('X-Custom-Header');
      expect(Object.keys(headers)).toHaveLength(2);
    });
  });

  describe('deleteHeaders', () => {
    it('should delete multiple headers at once', () => {
      const req = createRequest();
      req.deleteHeaders(['Authorization', 'X-Custom-Header']);
      expect(req.getHeader('Authorization')).toBeUndefined();
      expect(req.getHeader('X-Custom-Header')).toBeUndefined();
    });

    it('should not affect headers not in the deletion list', () => {
      const req = createRequest();
      req.deleteHeaders(['Authorization', 'X-Custom-Header']);
      expect(req.getHeader('Content-Type')).toBe('application/json');
    });

    it('should handle an empty array without errors', () => {
      const req = createRequest();
      expect(() => req.deleteHeaders([])).not.toThrow();
      expect(Object.keys(req.getHeaders())).toHaveLength(3);
    });

    it('should handle deleting non-existing headers gracefully', () => {
      const req = createRequest();
      expect(() => req.deleteHeaders(['X-Non-Existent', 'X-Also-Missing'])).not.toThrow();
      expect(Object.keys(req.getHeaders())).toHaveLength(3);
    });

    it('should delete all headers when all are specified', () => {
      const req = createRequest();
      req.deleteHeaders(['Content-Type', 'Authorization', 'X-Custom-Header']);
      expect(req.getHeaders()).toEqual({});
    });
  });
});
