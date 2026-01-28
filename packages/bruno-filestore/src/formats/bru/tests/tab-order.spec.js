import {
    parseBruCollection,
    parseBruRequest,
    stringifyBruCollection,
    stringifyBruRequest
} from '../index';

describe('Bru Tab Order Persistence', () => {
    describe('Requests', () => {
        it('should stringify request with requestTabOrder', () => {
            const request = {
                type: 'http-request',
                name: 'Get Users',
                seq: 1,
                requestTabOrder: ['params', 'headers', 'body'],
                request: {
                    method: 'GET',
                    url: 'https://api.example.com/users',
                    headers: [],
                    params: [],
                    auth: { mode: 'none' },
                    body: { mode: 'none' }
                }
            };

            const bru = stringifyBruRequest(request);
            expect(bru).toContain('requestTabOrder: [');
            expect(bru).toContain('params');
            expect(bru).toContain('headers');
            expect(bru).toContain('body');
        });

        it('should parse request with requestTabOrder', () => {
            const bru = `
meta {
  name: Get Users
  type: http
  seq: 1
  requestTabOrder: [
    params
    headers
    body
  ]
}

get {
  url: https://api.example.com/users
}
`;
            const parsed = parseBruRequest(bru);
            expect(parsed.requestTabOrder).toEqual(['params', 'headers', 'body']);
        });
    });

    describe('Collections/Folders', () => {
        it('should stringify collection with requestTabOrder', () => {
            const collection = {
                requestTabOrder: ['headers', 'params'],
                request: {
                    headers: [],
                    auth: { mode: 'none' }
                }
            };

            const bru = stringifyBruCollection(collection);
            expect(bru).toContain('requestTabOrder: [');
            expect(bru).toContain('headers');
            expect(bru).toContain('params');
        });

        it('should parse collection with requestTabOrder', () => {
            const bru = `
meta {
  requestTabOrder: [
    headers
    params
  ]
}
`;
            const parsed = parseBruCollection(bru);
            expect(parsed.requestTabOrder).toEqual(['headers', 'params']);
        });
    });
});
