import { sortResponseHeaders } from './index';

describe('sortResponseHeaders', () => {
  it('sorts response headers alphabetically by name', () => {
    const headers = {
      'X-Request-Id': 'request-id',
      'content-type': 'application/json',
      'Accept': '*/*'
    };

    expect(sortResponseHeaders(headers)).toEqual([
      ['Accept', '*/*'],
      ['content-type', 'application/json'],
      ['X-Request-Id', 'request-id']
    ]);
  });
});
