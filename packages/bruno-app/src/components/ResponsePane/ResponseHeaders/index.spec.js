import { sortResponseHeaders } from './index';
import { nextHeaderSortOrder } from './sortOrder';

describe('sortResponseHeaders', () => {
  it('sorts response headers alphabetically by name', () => {
    const headers = {
      'X-Request-Id': 'request-id',
      'content-type': 'application/json',
      'Accept': '*/*'
    };

    expect(sortResponseHeaders(headers, 'alphabetical')).toEqual([
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

    expect(sortResponseHeaders(headers, 'alphabetical')).toEqual([
      ['accept', 'first accept value'],
      ['Accept', 'second accept value'],
      ['Content-Type', 'application/json'],
      ['x-request-id', 'request-id']
    ]);
  });

  it('cycles through ascending, descending, and original arrival order', () => {
    const headers = { Zebra: 'z', alpha: 'a', Middle: 'm' };
    const ascending = nextHeaderSortOrder('default');
    const descending = nextHeaderSortOrder(ascending);
    const cleared = nextHeaderSortOrder(descending);
    expect(sortResponseHeaders(headers, ascending).map(([name]) => name)).toEqual(['alpha', 'Middle', 'Zebra']);
    expect(sortResponseHeaders(headers, descending).map(([name]) => name)).toEqual(['Zebra', 'Middle', 'alpha']);
    expect(sortResponseHeaders(headers, cleared)).toEqual(Object.entries(headers));
  });
});
