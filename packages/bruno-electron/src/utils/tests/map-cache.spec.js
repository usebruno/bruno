const MapCache = require('../map-cache');

describe('MapCache', () => {
  jest.useFakeTimers();

  let cache;

  beforeEach(() => {
    cache = new MapCache(1000); // 1 second TTL for testing
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should set and get values correctly', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return undefined for non-existent keys', () => {
    expect(cache.get('nonExistentKey')).toBeUndefined();
  });

  it('should delete keys correctly', () => {
    cache.set('key2', 'value2');
    expect(cache.get('key2')).toBe('value2');
    cache.delete('key2');
    expect(cache.get('key2')).toBeUndefined();
  });

  it('should clear all entries correctly', () => {
    cache.set('key3', 'value3');
    cache.set('key4', 'value4');
    expect(cache.get('key3')).toBe('value3');
    expect(cache.get('key4')).toBe('value4');
    cache.clear();
    expect(cache.get('key3')).toBeUndefined();
    expect(cache.get('key4')).toBeUndefined();
  });

  it('should expire entries after TTL', () => {
    cache.set('key5', 'value5');
    expect(cache.get('key5')).toBe('value5');
    jest.advanceTimersByTime(1001); // Advance time by just over 1 second
    expect(cache.get('key5')).toBeUndefined();
  });

  it('should not expire entries before TTL', () => {
    cache.set('key6', 'value6');
    expect(cache.get('key6')).toBe('value6');
    jest.advanceTimersByTime(500); // Advance time by half a second
    expect(cache.get('key6')).toBe('value6');
  });

  it('should reset TTL on set', () => {
    cache.set('key7', 'value7');
    jest.advanceTimersByTime(800); // Advance time by 0.8 seconds
    cache.set('key7', 'value7Updated'); // Reset TTL
    jest.advanceTimersByTime(300); // Advance time by 0.3 seconds (total 1.1 seconds from first set)
    expect(cache.get('key7')).toBe('value7Updated'); // Should still exist
    jest.advanceTimersByTime(701); // Advance time by another 0.7 seconds (total 2 seconds from first set)
    expect(cache.get('key7')).toBeUndefined(); // Should be expired now
  });
});
