import { transformProxyConfig } from './proxy-util';

describe('transformProxyConfig', () => {
  describe('Migration from old to new format', () => {
    describe('Old Format: enabled (true | false | "global")', () => {
      test('should migrate enabled: true to disabled: false, inherit: false', () => {
        const oldConfig = {
          enabled: true,
          protocol: 'http',
          hostname: 'proxy.example.com',
          port: 8080,
          auth: {
            enabled: true,
            username: 'user',
            password: 'pass'
          },
          bypassProxy: 'localhost'
        };

        const result = transformProxyConfig(oldConfig);

        expect(result).toEqual({
          inherit: false,
          config: {
            protocol: 'http',
            hostname: 'proxy.example.com',
            port: 8080,
            auth: {
              username: 'user',
              password: 'pass'
            },
            bypassProxy: 'localhost'
          }
        });
        expect((result as any).disabled).toBeUndefined(); // disabled: false is omitted
      });

      test('should migrate enabled: false to disabled: true, inherit: false', () => {
        const oldConfig = {
          enabled: false,
          protocol: 'http',
          hostname: 'proxy.example.com',
          port: 8080,
          auth: {
            enabled: false,
            username: '',
            password: ''
          },
          bypassProxy: ''
        };

        const result = transformProxyConfig(oldConfig);

        expect((result as any).disabled).toBe(true);
        expect((result as any).inherit).toBe(false);
      });

      test('should migrate enabled: "global" to disabled: false, inherit: true', () => {
        const oldConfig = {
          enabled: 'global' as const,
          protocol: 'http',
          hostname: '',
          port: null,
          auth: {
            enabled: false,
            username: '',
            password: ''
          },
          bypassProxy: ''
        };

        const result = transformProxyConfig(oldConfig);

        expect((result as any).disabled).toBeUndefined(); // disabled: false is omitted
        expect((result as any).inherit).toBe(true);
      });

      test('should migrate auth.enabled: false to auth.disabled: true', () => {
        const oldConfig = {
          enabled: true,
          protocol: 'http',
          hostname: 'proxy.example.com',
          port: 8080,
          auth: {
            enabled: false,
            username: 'user',
            password: 'pass'
          },
          bypassProxy: ''
        };

        const result = transformProxyConfig(oldConfig);

        expect((result as any).config.auth.disabled).toBe(true);
        expect((result as any).config.auth.username).toBe('user');
        expect((result as any).config.auth.password).toBe('pass');
      });

      test('should omit auth.disabled when auth.enabled: true', () => {
        const oldConfig = {
          enabled: true,
          protocol: 'http',
          hostname: 'proxy.example.com',
          port: 8080,
          auth: {
            enabled: true,
            username: 'user',
            password: 'pass'
          },
          bypassProxy: ''
        };

        const result = transformProxyConfig(oldConfig);

        expect((result as any).config.auth.disabled).toBeUndefined();
        expect((result as any).config.auth.username).toBe('user');
        expect((result as any).config.auth.password).toBe('pass');
      });
    });

    describe('New Format (no migration)', () => {
      test('should not modify new format with inherit: false', () => {
        const newConfig = {
          inherit: false,
          config: {
            protocol: 'https',
            hostname: 'proxy.example.com',
            port: 8443,
            auth: {
              username: 'user',
              password: 'pass'
            },
            bypassProxy: '*.local'
          }
        };

        const result = transformProxyConfig(newConfig);

        expect(result).toEqual(newConfig);
      });

      test('should not modify new format with inherit: true', () => {
        const newConfig = {
          inherit: true,
          config: {
            protocol: 'http',
            hostname: '',
            port: null,
            auth: {
              username: '',
              password: ''
            },
            bypassProxy: ''
          }
        };

        const result = transformProxyConfig(newConfig);

        expect(result).toEqual(newConfig);
      });

      test('should not modify new format with disabled: true', () => {
        const newConfig = {
          disabled: true,
          inherit: false,
          config: {
            protocol: 'http',
            hostname: '',
            port: null,
            auth: {
              username: '',
              password: ''
            },
            bypassProxy: ''
          }
        };

        const result = transformProxyConfig(newConfig);

        expect(result).toEqual(newConfig);
      });

      test('should not modify new format with auth.disabled: true', () => {
        const newConfig = {
          inherit: false,
          config: {
            protocol: 'http',
            hostname: 'proxy.example.com',
            port: 8080,
            auth: {
              disabled: true,
              username: 'user',
              password: 'pass'
            },
            bypassProxy: ''
          }
        };

        const result = transformProxyConfig(newConfig);

        expect(result).toEqual(newConfig);
      });
    });

    describe('Edge Cases', () => {
      test('should handle missing/null/undefined proxy config', () => {
        expect(transformProxyConfig(null)).toEqual({});
        expect(transformProxyConfig(undefined)).toEqual({});
        expect(transformProxyConfig({})).toEqual({});
      });

      test('should handle null port values', () => {
        const oldConfig = {
          enabled: true,
          protocol: 'http',
          hostname: 'proxy.example.com',
          port: null,
          auth: {
            enabled: false,
            username: '',
            password: ''
          },
          bypassProxy: ''
        };

        const result = transformProxyConfig(oldConfig);

        expect((result as any).config.port).toBeNull();
      });

      test('should handle SOCKS protocols', () => {
        const oldConfig = {
          enabled: true,
          protocol: 'socks5',
          hostname: 'socks.example.com',
          port: 1080,
          auth: {
            enabled: true,
            username: 'socksuser',
            password: 'sockspass'
          },
          bypassProxy: ''
        };

        const result = transformProxyConfig(oldConfig);

        expect((result as any).config.protocol).toBe('socks5');
        expect((result as any).config.hostname).toBe('socks.example.com');
        expect((result as any).config.port).toBe(1080);
      });

      test('should handle missing auth object', () => {
        const oldConfig = {
          enabled: true,
          protocol: 'http',
          hostname: 'proxy.example.com',
          port: 8080,
          bypassProxy: ''
        };

        const result = transformProxyConfig(oldConfig);

        expect((result as any).config.auth).toEqual({
          username: '',
          password: ''
        });
      });

      test('should handle missing protocol (defaults to http)', () => {
        const oldConfig = {
          enabled: true,
          hostname: 'proxy.example.com',
          port: 8080
        };

        const result = transformProxyConfig(oldConfig);

        expect((result as any).config.protocol).toBe('http');
      });

      test('should handle missing hostname (defaults to empty string)', () => {
        const oldConfig = {
          enabled: true,
          protocol: 'http',
          port: 8080
        };

        const result = transformProxyConfig(oldConfig);

        expect((result as any).config.hostname).toBe('');
      });

      test('should handle missing port (defaults to null)', () => {
        const oldConfig = {
          enabled: true,
          protocol: 'http',
          hostname: 'proxy.example.com'
        };

        const result = transformProxyConfig(oldConfig);

        expect((result as any).config.port).toBeNull();
      });

      test('should handle missing bypassProxy (defaults to empty string)', () => {
        const oldConfig = {
          enabled: true,
          protocol: 'http',
          hostname: 'proxy.example.com',
          port: 8080
        };

        const result = transformProxyConfig(oldConfig);

        expect((result as any).config.bypassProxy).toBe('');
      });

      test('should handle auth with missing username/password', () => {
        const oldConfig = {
          enabled: true,
          protocol: 'http',
          hostname: 'proxy.example.com',
          port: 8080,
          auth: {
            enabled: true
          }
        };

        const result = transformProxyConfig(oldConfig);

        expect((result as any).config.auth.username).toBe('');
        expect((result as any).config.auth.password).toBe('');
      });
    });
  });
});
