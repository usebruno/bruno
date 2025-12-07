import { getAuthHeaders } from './auth';

describe('codegenerator/auth.getAuthHeaders', () => {
    describe('new usage - resolved auth passed directly', () => {
        it('should return Basic auth header when resolved auth mode is basic', () => {
            const resolvedAuth = {
                mode: 'basic',
                basic: { username: 'testuser', password: 'testpass' }
            };
            const request = { url: 'https://example.com' };

            const headers = getAuthHeaders(resolvedAuth, request);

            expect(headers).toHaveLength(1);
            expect(headers[0].name).toBe('Authorization');
            expect(headers[0].value).toContain('Basic ');
            // Base64 of 'testuser:testpass' = 'dGVzdHVzZXI6dGVzdHBhc3M='
            expect(headers[0].value).toBe('Basic dGVzdHVzZXI6dGVzdHBhc3M=');
            expect(headers[0].enabled).toBe(true);
        });

        it('should return Bearer auth header when resolved auth mode is bearer', () => {
            const resolvedAuth = {
                mode: 'bearer',
                bearer: { token: 'my-jwt-token' }
            };
            const request = { url: 'https://example.com' };

            const headers = getAuthHeaders(resolvedAuth, request);

            expect(headers).toHaveLength(1);
            expect(headers[0].name).toBe('Authorization');
            expect(headers[0].value).toBe('Bearer my-jwt-token');
            expect(headers[0].enabled).toBe(true);
        });

        it('should return API key header when resolved auth mode is apikey with header placement', () => {
            const resolvedAuth = {
                mode: 'apikey',
                apikey: { key: 'X-API-Key', value: 'secret-api-key', placement: 'header' }
            };
            const request = { url: 'https://example.com' };

            const headers = getAuthHeaders(resolvedAuth, request);

            expect(headers).toHaveLength(1);
            expect(headers[0].name).toBe('X-API-Key');
            expect(headers[0].value).toBe('secret-api-key');
            expect(headers[0].enabled).toBe(true);
        });

        it('should return empty array when resolved auth mode is none', () => {
            const resolvedAuth = { mode: 'none' };
            const request = { url: 'https://example.com' };

            const headers = getAuthHeaders(resolvedAuth, request);

            expect(headers).toHaveLength(0);
        });

        it('should return empty array when resolved auth mode is still inherit (unresolved)', () => {
            const resolvedAuth = { mode: 'inherit' };
            const request = { url: 'https://example.com' };

            const headers = getAuthHeaders(resolvedAuth, request);

            expect(headers).toHaveLength(0);
        });
    });

    describe('legacy usage - collection auth and request auth', () => {
        it('should use collection auth when request mode is inherit', () => {
            const collectionAuth = {
                mode: 'basic',
                basic: { username: 'colluser', password: 'collpass' }
            };
            const requestAuth = { mode: 'inherit' };

            const headers = getAuthHeaders(collectionAuth, requestAuth);

            expect(headers).toHaveLength(1);
            expect(headers[0].name).toBe('Authorization');
            expect(headers[0].value).toContain('Basic ');
        });

        it('should use request auth when mode is not inherit', () => {
            const collectionAuth = {
                mode: 'basic',
                basic: { username: 'colluser', password: 'collpass' }
            };
            const requestAuth = {
                mode: 'bearer',
                bearer: { token: 'request-token' }
            };

            const headers = getAuthHeaders(collectionAuth, requestAuth);

            expect(headers).toHaveLength(1);
            expect(headers[0].name).toBe('Authorization');
            expect(headers[0].value).toBe('Bearer request-token');
        });
    });

    describe('edge cases', () => {
        it('should return empty array when both params are null', () => {
            const headers = getAuthHeaders(null, null);
            expect(headers).toHaveLength(0);
        });

        it('should return empty array when both params are undefined', () => {
            const headers = getAuthHeaders(undefined, undefined);
            expect(headers).toHaveLength(0);
        });

        it('should handle request object with auth property (new usage)', () => {
            const resolvedAuth = { mode: 'none' }; // First param indicates no direct auth
            const request = {
                url: 'https://example.com',
                auth: {
                    mode: 'basic',
                    basic: { username: 'requser', password: 'reqpass' }
                }
            };

            const headers = getAuthHeaders(resolvedAuth, request);

            // Should fall through to use request.auth
            expect(headers).toHaveLength(1);
            expect(headers[0].name).toBe('Authorization');
        });
    });
});

describe('generate code uses resolved folder basic auth for cURL', () => {
    it('should use folder basic auth when request inherits from folder', async () => {
        // This simulates the full flow after resolveInheritedAuth is called
        const resolvedAuth = {
            mode: 'basic',
            basic: { username: 'folderuser', password: 'folderpass' }
        };
        const request = {
            url: 'https://example.com',
            auth: resolvedAuth // After resolution, auth should be the folder's auth
        };

        const headers = getAuthHeaders(resolvedAuth, request);

        expect(headers).toHaveLength(1);
        expect(headers[0].name).toBe('Authorization');
        expect(headers[0].value).toContain('Basic ');
        // Verify the credentials are from the folder
        const decoded = Buffer.from(headers[0].value.replace('Basic ', ''), 'base64').toString();
        expect(decoded).toBe('folderuser:folderpass');
    });
});
