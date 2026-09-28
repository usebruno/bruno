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

  it('sorts header names without regard to capitalization', () => {
    const headers = {
      'x-request-id': 'request-id',
      'Content-Type': 'application/json',
      'accept': 'first accept value',
      'Accept': 'second accept value'
    };

    expect(sortResponseHeaders(headers)).toEqual([
      ['accept', 'first accept value'],
      ['Accept', 'second accept value'],
      ['Content-Type', 'application/json'],
      ['x-request-id', 'request-id']
    ]);
  });
});
