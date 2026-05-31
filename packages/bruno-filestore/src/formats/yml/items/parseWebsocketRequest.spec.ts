import parseWebsocketRequest from './parseWebsocketRequest';

describe('parseWebsocketRequest', () => {
  describe('body.ws initialization', () => {
    it('should initialize with one default message when no message data is present', () => {
      const result = parseWebsocketRequest({
        info: { name: 'test', seq: 1 },
        websocket: { url: 'ws://localhost:8082/ws' }
      } as any);

      expect(result.request.body.ws).toHaveLength(1);
      expect(result.request.body.ws[0].content).toBe('{}');
      expect(result.request.body.ws[0].name).toBe('message 1');
    });

    it('should NOT initialize with an empty array when no message data is present', () => {
      const result = parseWebsocketRequest({
        info: { name: 'test', seq: 1 },
        websocket: { url: 'ws://localhost:8082/ws' }
      } as any);

      // regression guard: ws: [] caused a blank Message tab in the UI
      expect(result.request.body.ws).not.toHaveLength(0);
    });

    it('should use message data from the YAML when present', () => {
      const result = parseWebsocketRequest({
        info: { name: 'test', seq: 1 },
        websocket: {
          url: 'ws://localhost:8082/ws',
          message: { data: '{"hello":"world"}', type: 'json' }
        }
      } as any);

      expect(result.request.body.ws).toHaveLength(1);
      expect(result.request.body.ws[0].content).toBe('{"hello":"world"}');
      expect(result.request.body.ws[0].type).toBe('json');
    });

    it('should fall back to default message when message data is whitespace-only', () => {
      const result = parseWebsocketRequest({
        info: { name: 'test', seq: 1 },
        websocket: {
          url: 'ws://localhost:8082/ws',
          message: { data: '   ', type: 'text' }
        }
      } as any);

      // whitespace-only data should not count as a real message
      expect(result.request.body.ws).toHaveLength(1);
      expect(result.request.body.ws[0].content).toBe('{}');
    });

    it('should set body mode to ws', () => {
      const result = parseWebsocketRequest({
        info: { name: 'test', seq: 1 },
        websocket: { url: 'ws://localhost:8082/ws' }
      } as any);

      expect(result.request.body.mode).toBe('ws');
    });
  });
});
