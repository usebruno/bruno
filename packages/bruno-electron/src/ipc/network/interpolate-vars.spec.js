const interpolateVars = require('./interpolate-vars');

describe('interpolateVars - path params', () => {
  it('substitutes multiple path params packed in one comma-separated segment', () => {
    const request = {
      url: 'https://api.test/points/:lat,:lon',
      mode: 'get',
      headers: {},
      data: { mode: 'none' },
      pathParams: [
        { name: 'lat', value: '39.7', type: 'path', enabled: true },
        { name: 'lon', value: '-104.9', type: 'path', enabled: true }
      ]
    };
    interpolateVars(request);
    expect(request.url).toBe('https://api.test/points/39.7,-104.9');
  });

  it('still substitutes a single path param (regression)', () => {
    const request = {
      url: 'https://api.test/items/:id',
      mode: 'get',
      headers: {},
      data: { mode: 'none' },
      pathParams: [{ name: 'id', value: '42', type: 'path', enabled: true }]
    };
    interpolateVars(request);
    expect(request.url).toBe('https://api.test/items/42');
  });

  it('leaves an unsolvable token literal', () => {
    const request = {
      url: 'https://api.test/items/:missing',
      mode: 'get',
      headers: {},
      data: { mode: 'none' },
      pathParams: []
    };
    interpolateVars(request);
    expect(request.url).toBe('https://api.test/items/:missing');
  });
});
