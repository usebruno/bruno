const { transformBrunoConfigBeforeSave, transformBrunoConfigAfterRead } = require('../../src/utils/transformBrunoConfig');

describe('BrunoConfig Proxy Transform', () => {
  describe('transformBrunoConfigAfterRead - Migration from old to new format', () => {
    describe('Old Format: enabled (true | false | "global")', () => {
      test('should migrate enabled: true to disabled: false, inherit: false', async () => {
        const oldConfig = {
          name: 'Test Collection',
          proxy: {
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
          }
        };

        const result = await transformBrunoConfigAfterRead(oldConfig, '/test/path');

        expect(result.proxy).toEqual({
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
        expect(result.proxy.disabled).toBeUndefined(); // disabled: false is omitted
      });

      test('should migrate enabled: false to disabled: true, inherit: false', async () => {
        const oldConfig = {
          name: 'Test Collection',
          proxy: {
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
          }
        };

        const result = await transformBrunoConfigAfterRead(oldConfig, '/test/path');

        expect(result.proxy.disabled).toBe(true);
        expect(result.proxy.inherit).toBe(false);
      });

      test('should migrate enabled: "global" to disabled: false, inherit: true', async () => {
        const oldConfig = {
          name: 'Test Collection',
          proxy: {
            enabled: 'global',
            protocol: 'http',
            hostname: '',
            port: null,
            auth: {
              enabled: false,
              username: '',
              password: ''
            },
            bypassProxy: ''
          }
        };

        const result = await transformBrunoConfigAfterRead(oldConfig, '/test/path');

        expect(result.proxy.disabled).toBeUndefined(); // disabled: false is omitted
        expect(result.proxy.inherit).toBe(true);
      });

      test('should migrate auth.enabled: false to auth.disabled: true', async () => {
        const oldConfig = {
          name: 'Test Collection',
          proxy: {
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
          }
        };

        const result = await transformBrunoConfigAfterRead(oldConfig, '/test/path');

        expect(result.proxy.config.auth.disabled).toBe(true);
        expect(result.proxy.config.auth.username).toBe('user');
        expect(result.proxy.config.auth.password).toBe('pass');
      });

      test('should omit auth.disabled when auth.enabled: true', async () => {
        const oldConfig = {
          name: 'Test Collection',
          proxy: {
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
          }
        };

        const result = await transformBrunoConfigAfterRead(oldConfig, '/test/path');

        expect(result.proxy.config.auth.disabled).toBeUndefined();
        expect(result.proxy.config.auth.username).toBe('user');
        expect(result.proxy.config.auth.password).toBe('pass');
      });
    });

    describe('New Format (no migration)', () => {
      test('should not modify new format with inherit: false', async () => {
        const newConfig = {
          name: 'Test Collection',
          proxy: {
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
          }
        };

        const result = await transformBrunoConfigAfterRead(newConfig, '/test/path');

        expect(result.proxy).toEqual(newConfig.proxy);
      });

      test('should not modify new format with inherit: true', async () => {
        const newConfig = {
          name: 'Test Collection',
          proxy: {
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
          }
        };

        const result = await transformBrunoConfigAfterRead(newConfig, '/test/path');

        expect(result.proxy).toEqual(newConfig.proxy);
      });

      test('should not modify new format with disabled: true', async () => {
        const newConfig = {
          name: 'Test Collection',
          proxy: {
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
          }
        };

        const result = await transformBrunoConfigAfterRead(newConfig, '/test/path');

        expect(result.proxy).toEqual(newConfig.proxy);
      });

      test('should not modify new format with auth.disabled: true', async () => {
        const newConfig = {
          name: 'Test Collection',
          proxy: {
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
          }
        };

        const result = await transformBrunoConfigAfterRead(newConfig, '/test/path');

        expect(result.proxy).toEqual(newConfig.proxy);
      });
    });

    describe('Edge Cases', () => {
      test('should handle missing proxy config', async () => {
        const config = {
          name: 'Test Collection'
        };

        const result = await transformBrunoConfigAfterRead(config, '/test/path');

        expect(result.proxy).toBeUndefined();
      });

      test('should handle null port values', async () => {
        const oldConfig = {
          name: 'Test Collection',
          proxy: {
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
          }
        };

        const result = await transformBrunoConfigAfterRead(oldConfig, '/test/path');

        expect(result.proxy.config.port).toBeNull();
      });

      test('should handle SOCKS protocols', async () => {
        const oldConfig = {
          name: 'Test Collection',
          proxy: {
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
          }
        };

        const result = await transformBrunoConfigAfterRead(oldConfig, '/test/path');

        expect(result.proxy.config.protocol).toBe('socks5');
        expect(result.proxy.config.hostname).toBe('socks.example.com');
        expect(result.proxy.config.port).toBe(1080);
      });

      test('should handle missing auth object', async () => {
        const oldConfig = {
          name: 'Test Collection',
          proxy: {
            enabled: true,
            protocol: 'http',
            hostname: 'proxy.example.com',
            port: 8080,
            bypassProxy: ''
          }
        };

        const result = await transformBrunoConfigAfterRead(oldConfig, '/test/path');

        expect(result.proxy.config.auth).toEqual({
          username: '',
          password: ''
        });
      });

      test('should preserve protobuf config during proxy migration', async () => {
        const oldConfig = {
          name: 'Test Collection',
          protobuf: {
            protoFiles: [{ path: 'test.proto' }],
            importPaths: [{ path: 'imports/' }]
          },
          proxy: {
            enabled: 'global',
            protocol: 'http',
            hostname: '',
            port: null,
            auth: {
              enabled: false,
              username: '',
              password: ''
            },
            bypassProxy: ''
          }
        };

        const result = await transformBrunoConfigAfterRead(oldConfig, '/test/path');

        expect(result.protobuf).toBeDefined();
        expect(result.protobuf.protoFiles).toHaveLength(1);
        expect(result.proxy.inherit).toBe(true);
      });
    });
  });

  describe('transformBrunoConfigBeforeSave - Cleanup optional fields', () => {
    test('should remove disabled: false from proxy config', () => {
      const config = {
        name: 'Test Collection',
        proxy: {
          disabled: false,
          inherit: false,
          config: {
            protocol: 'http',
            hostname: 'proxy.example.com',
            port: 8080,
            auth: {
              username: 'user',
              password: 'pass'
            },
            bypassProxy: ''
          }
        }
      };

      const result = transformBrunoConfigBeforeSave(config);

      expect(result.proxy.disabled).toBeUndefined();
      expect(result.proxy.inherit).toBe(false);
    });

    test('should keep disabled: true in proxy config', () => {
      const config = {
        name: 'Test Collection',
        proxy: {
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
        }
      };

      const result = transformBrunoConfigBeforeSave(config);

      expect(result.proxy.disabled).toBe(true);
    });

    test('should remove auth.disabled: false from proxy config', () => {
      const config = {
        name: 'Test Collection',
        proxy: {
          inherit: false,
          config: {
            protocol: 'http',
            hostname: 'proxy.example.com',
            port: 8080,
            auth: {
              disabled: false,
              username: 'user',
              password: 'pass'
            },
            bypassProxy: ''
          }
        }
      };

      const result = transformBrunoConfigBeforeSave(config);

      expect(result.proxy.config.auth.disabled).toBeUndefined();
      expect(result.proxy.config.auth.username).toBe('user');
    });

    test('should keep auth.disabled: true in proxy config', () => {
      const config = {
        name: 'Test Collection',
        proxy: {
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
        }
      };

      const result = transformBrunoConfigBeforeSave(config);

      expect(result.proxy.config.auth.disabled).toBe(true);
    });

    test('should handle missing proxy config', () => {
      const config = {
        name: 'Test Collection'
      };

      const result = transformBrunoConfigBeforeSave(config);

      expect(result.proxy).toBeUndefined();
    });

    test('should preserve protobuf config cleanup', () => {
      const config = {
        name: 'Test Collection',
        protobuf: {
          protoFiles: [{ path: 'test.proto', exists: true }],
          importPaths: [{ path: 'imports/', exists: false }]
        },
        proxy: {
          disabled: false,
          inherit: false,
          config: {
            protocol: 'http',
            hostname: 'proxy.example.com',
            port: 8080,
            auth: {
              disabled: false,
              username: 'user',
              password: 'pass'
            },
            bypassProxy: ''
          }
        }
      };

      const result = transformBrunoConfigBeforeSave(config);

      // Protobuf exists fields should be removed
      expect(result.protobuf.protoFiles[0].exists).toBeUndefined();
      expect(result.protobuf.importPaths[0].exists).toBeUndefined();

      // Proxy optional fields should be removed
      expect(result.proxy.disabled).toBeUndefined();
      expect(result.proxy.config.auth.disabled).toBeUndefined();
    });

    test('should not modify config without optional fields', () => {
      const config = {
        name: 'Test Collection',
        proxy: {
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
        }
      };

      const result = transformBrunoConfigBeforeSave(config);

      expect(result.proxy).toEqual(config.proxy);
    });
  });

  describe('Round-trip transformation', () => {
    test('should handle read -> save -> read cycle for old format', async () => {
      const oldConfig = {
        name: 'Test Collection',
        proxy: {
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
        }
      };

      // Read (migrate)
      const afterRead = await transformBrunoConfigAfterRead(oldConfig, '/test/path');

      // Save (cleanup)
      const beforeSave = transformBrunoConfigBeforeSave(afterRead);

      // Read again (should not change)
      const afterSecondRead = await transformBrunoConfigAfterRead(beforeSave, '/test/path');

      expect(afterSecondRead.proxy).toEqual(beforeSave.proxy);
      expect(afterSecondRead.proxy.inherit).toBe(false);
      expect(afterSecondRead.proxy.disabled).toBeUndefined();
      expect(afterSecondRead.proxy.config.auth.disabled).toBeUndefined();
    });

    test('should handle read -> save -> read cycle for new format', async () => {
      const newConfig = {
        name: 'Test Collection',
        proxy: {
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
        }
      };

      // Read (no migration)
      const afterRead = await transformBrunoConfigAfterRead(newConfig, '/test/path');

      // Save (cleanup)
      const beforeSave = transformBrunoConfigBeforeSave(afterRead);

      // Read again (should not change)
      const afterSecondRead = await transformBrunoConfigAfterRead(beforeSave, '/test/path');

      expect(afterSecondRead.proxy).toEqual(newConfig.proxy);
    });
  });
});
