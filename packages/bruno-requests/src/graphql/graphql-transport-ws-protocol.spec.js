import {
  MESSAGE_TYPES,
  CLOSE_CODE_DESCRIPTIONS,
  encodeConnectionInit,
  encodeSubscribe,
  encodeComplete,
  encodePing,
  encodePong,
  decodeFrame,
  describeCloseCode
} from './graphql-transport-ws-protocol';

describe('graphql-transport-ws-protocol', () => {
  describe('encodeConnectionInit', () => {
    it('omits payload when absent', () => {
      expect(JSON.parse(encodeConnectionInit())).toEqual({ type: 'connection_init' });
      expect(JSON.parse(encodeConnectionInit(null))).toEqual({ type: 'connection_init' });
    });

    it('includes payload when provided', () => {
      expect(JSON.parse(encodeConnectionInit({ authToken: 'abc' }))).toEqual({
        type: 'connection_init',
        payload: { authToken: 'abc' }
      });
    });
  });

  describe('encodeSubscribe', () => {
    it('omits operationName, variables and extensions when absent', () => {
      const frame = JSON.parse(encodeSubscribe('1', { query: 'subscription { tick }' }));
      expect(frame).toEqual({
        id: '1',
        type: 'subscribe',
        payload: { query: 'subscription { tick }' }
      });
      expect(frame.payload).not.toHaveProperty('operationName');
      expect(frame.payload).not.toHaveProperty('variables');
      expect(frame.payload).not.toHaveProperty('extensions');
    });

    it('includes operationName, variables and extensions when provided', () => {
      const frame = JSON.parse(encodeSubscribe('2', {
        query: 'subscription OnTick { tick }',
        operationName: 'OnTick',
        variables: { count: 1 },
        extensions: { persistedQuery: true }
      }));

      expect(frame).toEqual({
        id: '2',
        type: 'subscribe',
        payload: {
          query: 'subscription OnTick { tick }',
          operationName: 'OnTick',
          variables: { count: 1 },
          extensions: { persistedQuery: true }
        }
      });
    });
  });

  describe('encodeComplete', () => {
    it('encodes a bare complete frame for the operation id', () => {
      expect(JSON.parse(encodeComplete('5'))).toEqual({ id: '5', type: 'complete' });
    });
  });

  describe('encodePing / encodePong', () => {
    it('omits payload when absent', () => {
      expect(JSON.parse(encodePing())).toEqual({ type: 'ping' });
      expect(JSON.parse(encodePong())).toEqual({ type: 'pong' });
    });

    it('includes payload when provided', () => {
      expect(JSON.parse(encodePing({ a: 1 }))).toEqual({ type: 'ping', payload: { a: 1 } });
      expect(JSON.parse(encodePong({ a: 1 }))).toEqual({ type: 'pong', payload: { a: 1 } });
    });
  });

  describe('decodeFrame', () => {
    it('decodes a well-formed frame', () => {
      expect(decodeFrame('{"id":"1","type":"next","payload":{"data":{"tick":1}}}')).toEqual({
        id: '1',
        type: 'next',
        payload: { data: { tick: 1 } }
      });
    });

    it('never throws on non-JSON input, returning type: unparsable with the raw text', () => {
      expect(decodeFrame('not json at all')).toEqual({ type: 'unparsable', raw: 'not json at all' });
    });

    it('treats a JSON array as unparsable', () => {
      expect(decodeFrame('[1,2,3]')).toEqual({ type: 'unparsable', raw: '[1,2,3]' });
    });

    it('treats a JSON object without a string `type` as unparsable', () => {
      expect(decodeFrame('{"id":"1"}')).toEqual({ type: 'unparsable', raw: '{"id":"1"}' });
      expect(decodeFrame('{"type":42}')).toEqual({ type: 'unparsable', raw: '{"type":42}' });
    });

    it('treats null and primitives as unparsable', () => {
      expect(decodeFrame('null')).toEqual({ type: 'unparsable', raw: 'null' });
      expect(decodeFrame('42')).toEqual({ type: 'unparsable', raw: '42' });
    });
  });

  describe('describeCloseCode', () => {
    it('describes every documented close code', () => {
      expect(describeCloseCode(4400)).toBe('Bad Request');
      expect(describeCloseCode(4401)).toBe('Unauthorized');
      expect(describeCloseCode(4403)).toBe('Forbidden');
      expect(describeCloseCode(4406)).toBe('Subprotocol Not Acceptable');
      expect(describeCloseCode(4408)).toBe('Connection Initialisation Timeout');
      expect(describeCloseCode(4409)).toBe('Subscriber Already Exists');
      expect(describeCloseCode(4429)).toBe('Too Many Initialisation Requests');
      expect(describeCloseCode(4500)).toBe('Internal Error');
    });

    it('falls back to an "Unknown" description for an undocumented code', () => {
      expect(describeCloseCode(1000)).toBe('Unknown (1000)');
    });
  });

  it('exposes every message type used by the protocol', () => {
    expect(MESSAGE_TYPES).toEqual({
      CONNECTION_INIT: 'connection_init',
      CONNECTION_ACK: 'connection_ack',
      PING: 'ping',
      PONG: 'pong',
      SUBSCRIBE: 'subscribe',
      NEXT: 'next',
      ERROR: 'error',
      COMPLETE: 'complete'
    });
  });

  it('exposes descriptions for all eight documented close codes', () => {
    expect(Object.keys(CLOSE_CODE_DESCRIPTIONS)).toHaveLength(8);
  });
});
