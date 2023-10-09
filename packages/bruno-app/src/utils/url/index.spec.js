import { parseQueryParams, splitOnFirst, parsePathParams } from './index';

describe('Url Utils - parseQueryParams', () => {
  it('should parse query - case 1', () => {
    const params = parseQueryParams('');
    expect(params).toEqual([]);
  });

  it('should parse query - case 2', () => {
    const params = parseQueryParams('a');
    expect(params).toEqual([{ name: 'a', value: '' }]);
  });

  it('should parse query - case 3', () => {
    const params = parseQueryParams('a=');
    expect(params).toEqual([{ name: 'a', value: '' }]);
  });

  it('should parse query - case 4', () => {
    const params = parseQueryParams('a=1');
    expect(params).toEqual([{ name: 'a', value: '1' }]);
  });

  it('should parse query - case 5', () => {
    const params = parseQueryParams('a=1&');
    expect(params).toEqual([{ name: 'a', value: '1' }]);
  });

  it('should parse query - case 6', () => {
    const params = parseQueryParams('a=1&b');
    expect(params).toEqual([
      { name: 'a', value: '1' },
      { name: 'b', value: '' }
    ]);
  });

  it('should parse query - case 7', () => {
    const params = parseQueryParams('a=1&b=');
    expect(params).toEqual([
      { name: 'a', value: '1' },
      { name: 'b', value: '' }
    ]);
  });

  it('should parse query - case 8', () => {
    const params = parseQueryParams('a=1&b=2');
    expect(params).toEqual([
      { name: 'a', value: '1' },
      { name: 'b', value: '2' }
    ]);
  });
});

describe('Url Utils - parsePathParams', () => {
  it('should parse path - case 1', () => {
    const params = parsePathParams('www.example.com');
    expect(params).toEqual([]);
  });

  it('should parse path - case 2', () => {
    const params = parsePathParams('http://www.example.com');
    expect(params).toEqual([]);
  });

  it('should parse path - case 3', () => {
    const params = parsePathParams('https://www.example.com');
    expect(params).toEqual([]);
  });

  it('should parse path - case 4', () => {
    const params = parsePathParams('https://www.example.com/users/:id');
    expect(params).toEqual([{ name: 'id', value: '' }]);
  });

  it('should parse path - case 5', () => {
    const params = parsePathParams('https://www.example.com/users/:id/');
    expect(params).toEqual([{ name: 'id', value: '' }]);
  });

  it('should parse path - case 6', () => {
    const params = parsePathParams('https://www.example.com/users/:id/:');
    expect(params).toEqual([{ name: 'id', value: '' }]);
  });

  it('should parse path - case 7', () => {
    const params = parsePathParams('https://www.example.com/users/:id/posts/:id');
    expect(params).toEqual([{ name: 'id', value: '' }]);
  });

  it('should parse path - case 8', () => {
    const params = parsePathParams('https://www.example.com/users/:id/posts/:postId');
    expect(params).toEqual([
      { name: 'id', value: '' },
      { name: 'postId', value: '' }
    ]);
  });
});

describe('Url Utils - splitOnFirst', () => {
  it('should split on first - case 1', () => {
    const params = splitOnFirst('a', '=');
    expect(params).toEqual(['a']);
  });

  it('should split on first - case 2', () => {
    const params = splitOnFirst('a=', '=');
    expect(params).toEqual(['a', '']);
  });

  it('should split on first - case 3', () => {
    const params = splitOnFirst('a=1', '=');
    expect(params).toEqual(['a', '1']);
  });

  it('should split on first - case 4', () => {
    const params = splitOnFirst('a=1&b=2', '=');
    expect(params).toEqual(['a', '1&b=2']);
  });

  it('should split on first - case 5', () => {
    const params = splitOnFirst('a=1&b=2', '&');
    expect(params).toEqual(['a=1', 'b=2']);
  });
});
