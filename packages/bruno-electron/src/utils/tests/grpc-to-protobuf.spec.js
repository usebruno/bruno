const { migrateGrpcToProtobuf, needsMigration } = require('../migrations/grpc-to-protobuf');

describe('grpc-to-protobuf migration', () => {
  describe('migrateGrpcToProtobuf', () => {
    it('should return the same config when no grpc config exists', () => {
      const brunoConfig = {
        name: 'Test Collection',
        version: '1.0.0',
        protobuf: {
          protoFiles: [     
            {
              path: 'user.proto',
              type: 'file'
            },
            {
              path: 'order.proto',
              type: 'file'
            }
          ],
          importPaths: [
            {
              path: '/path/to/protos',
              enabled: true
            },
            {
              path: '/path/to/imports',
              enabled: true
            }
          ],
        }
      };

      const result = migrateGrpcToProtobuf(brunoConfig);
      expect(result).toEqual(brunoConfig);
    });

    it('should return the same config when brunoConfig is null or undefined', () => {
      expect(migrateGrpcToProtobuf(null)).toBeNull();
      expect(migrateGrpcToProtobuf(undefined)).toBeUndefined();
    });

    it('should return the same config when brunoConfig is not an object', () => {
      expect(migrateGrpcToProtobuf('string')).toBe('string');
      expect(migrateGrpcToProtobuf(123)).toBe(123);
      expect(migrateGrpcToProtobuf(true)).toBe(true);
    });

    it('should migrate grpc config to protobuf when protobuf does not exist', () => {
      const brunoConfig = {
        name: 'Test Collection',
        version: '1.0.0',
        grpc: {
          protoFiles: [
            {
              path: 'user.proto',
              type: 'file'
            },
            {
              path: 'order.proto',
              type: 'file'
            }
          ],
          importPaths: [
            {
              path: '/path/to/protos',
              enabled: true
            },
            {
              path: '/path/to/imports',
              enabled: true
            }
          ],
        }
      };

      const result = migrateGrpcToProtobuf(brunoConfig);

      expect(result).toEqual({
        name: 'Test Collection',
        version: '1.0.0',
        protobuf: {
          protoFiles: [
            {
              path: 'user.proto',
              type: 'file'
            },
            {
              path: 'order.proto',
              type: 'file'
            }
          ],
          importPaths: [
            {
              path: '/path/to/protos',
              enabled: true
            },
            {
              path: '/path/to/imports',
              enabled: true
            }
          ],
        }
      });

      expect(result.grpc).toBeUndefined();
    });

    it('should merge grpc and protobuf configs when both exist', () => {
      const brunoConfig = {
        name: 'Test Collection',
        version: '1.0.0',
        grpc: {
          protoFiles: [
            {
              path: 'user.proto',
              type: 'file'
            }
          ],
          importPaths: [
            {
              path: '/path/to/grpc/protos',
              enabled: true
            }
          ],
        },
        protobuf: {
          protoFiles: [
            {
              path: 'order.proto',
              type: 'file'
            },
            {
              path: 'payment.proto',
              type: 'file'
            }
          ],
          importPaths: [
            {
              path: '/path/to/protobuf/protos',
              enabled: true
            }
          ],
        }
      };

      const result = migrateGrpcToProtobuf(brunoConfig);

      expect(result).toEqual({
        name: 'Test Collection',
        version: '1.0.0',
        protobuf: {
          protoFiles: [
            {
              path: 'user.proto',
              type: 'file'
            },
            {
              path: 'order.proto',
              type: 'file'
            },
            {
              path: 'payment.proto',
              type: 'file'
            }
          ],
          importPaths: [
            {
              path: '/path/to/grpc/protos',
              enabled: true
            },
            {
              path: '/path/to/protobuf/protos',
              enabled: true
            }
          ],
 // protobuf values take precedence
        }
      });

      expect(result.grpc).toBeUndefined();
    });

    it('should handle empty arrays in grpc and protobuf configs', () => {
      const brunoConfig = {
        name: 'Test Collection',
        grpc: {
          protoFiles: [],
          importPaths: [],
        },
        protobuf: {
          protoFiles: [
            {
              path: 'existing.proto',
              type: 'file'
            }
          ],
          importPaths: [
            {
              path: '/existing/path',
              enabled: true
            }
          ],
        }
      };

      const result = migrateGrpcToProtobuf(brunoConfig);

      expect(result.protobuf).toEqual({
        protoFiles: [
          {
            path: 'existing.proto',
            type: 'file'
          }
        ],
        importPaths: [
          {
            path: '/existing/path',
            enabled: true
          }
        ],
      });
    });

    it('should handle undefined arrays in grpc and protobuf configs', () => {
      const brunoConfig = {
        name: 'Test Collection',
        grpc: {
          protoFiles: undefined,
          importPaths: undefined,
        },
        protobuf: {
          protoFiles: [
            {
              path: 'existing.proto',
              type: 'file'
            }
          ],
          importPaths: [
            {
              path: '/existing/path',
              enabled: true
            }
          ],
        }
      };

      const result = migrateGrpcToProtobuf(brunoConfig);

      expect(result.protobuf).toEqual({
        protoFiles: [
          {
            path: 'existing.proto',
            type: 'file'
          }
        ],
        importPaths: [
          {
            path: '/existing/path',
            enabled: true
          }
        ],
 // protobuf values take precedence
      });
    });

    it('should not mutate the original config object', () => {
      const brunoConfig = {
        name: 'Test Collection',
        grpc: {
          protoFiles: [
            {
              path: 'user.proto',
              type: 'file'
            }
          ],
          importPaths: [
            {
              path: '/path/to/protos',
              enabled: true
            }
          ]
        }
      };

      const originalConfig = JSON.parse(JSON.stringify(brunoConfig));
      migrateGrpcToProtobuf(brunoConfig);

      expect(brunoConfig).toEqual(originalConfig);
    });
  });

  describe('needsMigration', () => {
    it('should return true when grpc config exists', () => {
      const brunoConfig = {
        name: 'Test Collection',
        grpc: {
          protoFiles: [
            {
              path: 'user.proto',
              type: 'file'
            }
          ]
        }
      };

      expect(needsMigration(brunoConfig)).toBe(true);
    });

    it('should return true when grpc config exists even if protobuf also exists', () => {
      const brunoConfig = {
        name: 'Test Collection',
        grpc: {
          protoFiles: [{
            path: 'user.proto',
            type: 'file'
          }]
        },
        protobuf: {
          protoFiles: [
            {
              path: 'order.proto',
              type: 'file'
            }
          ]
        }
      };

      expect(needsMigration(brunoConfig)).toBe(true);
    });

    it('should return false when grpc config does not exist', () => {
      const brunoConfig = {
        name: 'Test Collection',
        protobuf: {
          protoFiles: [
            {
              path: 'user.proto',
              type: 'file'
            }
          ]
        }
      };

      expect(needsMigration(brunoConfig)).toBe(false);
    });

    it('should return false when brunoConfig is null or undefined', () => {
      expect(needsMigration(null)).toBe(false);
      expect(needsMigration(undefined)).toBe(false);
    });

    it('should return false when grpc config is empty object', () => {
      const brunoConfig = {
        name: 'Test Collection',
        grpc: {}
      };

      expect(needsMigration(brunoConfig)).toBe(true); // Empty object still exists
    });

    it('should return false when grpc config is falsy', () => {
      const brunoConfig = {
        name: 'Test Collection',
        grpc: null
      };

      expect(needsMigration(brunoConfig)).toBe(false);
    });

    it('should return false when grpc config is undefined', () => {
      const brunoConfig = {
        name: 'Test Collection',
        protobuf: {}
      };

      expect(needsMigration(brunoConfig)).toBe(false);
    });

    it('should return false when grpc config and protobuf config are undefined', () => {
      const brunoConfig = {
        name: 'Test Collection',
      };

      expect(needsMigration(brunoConfig)).toBe(false);
    });
  });
});
