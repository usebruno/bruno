import { parseQueryParams } from './index';

describe('Url Utils - parseQueryParams', () => {
  it('should parse query - case 1',  () => {
    const params = parseQueryParams("");
    expect(params).toEqual([]);
  });

  it('should parse query - case 2',  () => {
    const params = parseQueryParams("a");
    expect(params).toEqual([{name: 'a', value: ''}]);
  });

  it('should parse query - case 3',  () => {
    const params = parseQueryParams("a=");
    expect(params).toEqual([{name: 'a', value: ''}]);
  });

  it('should parse query - case 4',  () => {
    const params = parseQueryParams("a=1");
    expect(params).toEqual([{name: 'a', value: '1'}]);
  });

  it('should parse query - case 5',  () => {
    const params = parseQueryParams("a=1&");
    expect(params).toEqual([{name: 'a', value: '1'}]);
  });

  it('should parse query - case 6',  () => {
    const params = parseQueryParams("a=1&b");
    expect(params).toEqual([{name: 'a', value: '1'}, {name: 'b', value: ''}]);
  });

  it('should parse query - case 7',  () => {
    const params = parseQueryParams("a=1&b=");
    expect(params).toEqual([{name: 'a', value: '1'}, {name: 'b', value: ''}]);
  });

  it('should parse query - case 8',  () => {
    const params = parseQueryParams("a=1&b=2");
    expect(params).toEqual([{name: 'a', value: '1'}, {name: 'b', value: '2'}]);
  });
});
