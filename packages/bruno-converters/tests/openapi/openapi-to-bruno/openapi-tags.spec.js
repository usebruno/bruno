import { describe, it, expect } from '@jest/globals';
import openApiToBruno from '../../../src/openapi/openapi-to-bruno';

/**
 * Helper function to find a request by name in the collection.
 * Searches recursively through folders since requests with tags
 * are grouped into folders.
 */
const findRequestByName = (items, name) => {
  for (const item of items) {
    if (item.type === 'http-request' && item.name === name) {
      return item;
    }
    if (item.type === 'folder' && item.items) {
      const found = findRequestByName(item.items, name);
      if (found) return found;
    }
  }
  return undefined;
};

/**
 * Helper function to find a folder by name in the collection.
 */
const findFolderByName = (items, name) => {
  for (const item of items) {
    if (item.type === 'folder' && item.name === name) {
      return item;
    }
    if (item.type === 'folder' && item.items) {
      const found = findFolderByName(item.items, name);
      if (found) return found;
    }
  }
  return undefined;
};

describe('OpenAPI Import - Tag Sanitization', () => {
  it('should replace spaces with underscores in tags', () => {
    const openApiSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0'
      },
      paths: {
        '/users': {
          get: {
            operationId: 'getUsers',
            summary: 'Get users',
            tags: ['User Management'],
            responses: {
              200: {
                description: 'Success'
              }
            }
          }
        }
      }
    };

    const result = openApiToBruno(JSON.stringify(openApiSpec));
    const request = findRequestByName(result.items, 'Get users');
    expect(request).toBeDefined();
    // Spaces are replaced with underscores for BRU format compatibility
    expect(request.tags).toEqual(['User_Management']);
  });

  it('should sanitize tags with dots', () => {
    const openApiSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0'
      },
      paths: {
        '/users': {
          get: {
            operationId: 'getUsers',
            summary: 'Get users',
            tags: ['api.v1', 'user.service'],
            responses: {
              200: {
                description: 'Success'
              }
            }
          }
        }
      }
    };

    const result = openApiToBruno(JSON.stringify(openApiSpec));
    const request = findRequestByName(result.items, 'Get users');
    expect(request).toBeDefined();
    // Dots should be replaced with underscores
    expect(request.tags).toEqual(['api_v1', 'user_service']);
  });

  it('should sanitize tags with special characters', () => {
    const openApiSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0'
      },
      paths: {
        '/users': {
          get: {
            operationId: 'getUsers',
            summary: 'Get users',
            tags: ['API (v1)', 'user-service:v2'],
            responses: {
              200: {
                description: 'Success'
              }
            }
          }
        }
      }
    };

    const result = openApiToBruno(JSON.stringify(openApiSpec));
    const request = findRequestByName(result.items, 'Get users');
    expect(request).toBeDefined();
    // Parentheses, colons, and spaces should be replaced with underscores
    // 'API (v1)' becomes 'API_v1' (space and parentheses become underscores, collapsed)
    expect(request.tags).toEqual(['API_v1', 'user-service_v2']);
  });

  it('should preserve valid tags', () => {
    const openApiSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0'
      },
      paths: {
        '/users': {
          get: {
            operationId: 'getUsers',
            summary: 'Get users',
            tags: ['users', 'api-v1', 'user_service'],
            responses: {
              200: {
                description: 'Success'
              }
            }
          }
        }
      }
    };

    const result = openApiToBruno(JSON.stringify(openApiSpec));
    const request = findRequestByName(result.items, 'Get users');
    expect(request).toBeDefined();
    expect(request.tags).toEqual(['users', 'api-v1', 'user_service']);
  });

  it('should handle empty tags array', () => {
    const openApiSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0'
      },
      paths: {
        '/users': {
          get: {
            operationId: 'getUsers',
            summary: 'Get users',
            tags: [],
            responses: {
              200: {
                description: 'Success'
              }
            }
          }
        }
      }
    };

    const result = openApiToBruno(JSON.stringify(openApiSpec));
    const request = findRequestByName(result.items, 'Get users');
    expect(request).toBeDefined();
    expect(request.tags).toEqual([]);
  });

  it('should handle missing tags property', () => {
    const openApiSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0'
      },
      paths: {
        '/users': {
          get: {
            operationId: 'getUsers',
            summary: 'Get users',
            responses: {
              200: {
                description: 'Success'
              }
            }
          }
        }
      }
    };

    const result = openApiToBruno(JSON.stringify(openApiSpec));
    const request = findRequestByName(result.items, 'Get users');
    expect(request).toBeDefined();
    expect(request.tags).toEqual([]);
  });

  it('should remove duplicate tags after sanitization', () => {
    const openApiSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0'
      },
      paths: {
        '/users': {
          get: {
            operationId: 'getUsers',
            summary: 'Get users',
            tags: ['User Management', 'User Management', 'user-management'],
            responses: {
              200: {
                description: 'Success'
              }
            }
          }
        }
      }
    };

    const result = openApiToBruno(JSON.stringify(openApiSpec));
    const request = findRequestByName(result.items, 'Get users');
    expect(request).toBeDefined();
    // 'User Management' becomes 'User_Management', which is different from 'user-management'
    expect(request.tags).toEqual(['User_Management', 'user-management']);
  });

  it('should filter out tags that become empty after sanitization', () => {
    const openApiSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0'
      },
      paths: {
        '/users': {
          get: {
            operationId: 'getUsers',
            summary: 'Get users',
            tags: ['...', 'valid-tag', '---'],
            responses: {
              200: {
                description: 'Success'
              }
            }
          }
        }
      }
    };

    const result = openApiToBruno(JSON.stringify(openApiSpec));
    const request = findRequestByName(result.items, 'Get users');
    expect(request).toBeDefined();
    expect(request.tags).toEqual(['valid-tag']);
  });

  it('should use sanitized tag names for folder grouping', () => {
    const openApiSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0'
      },
      paths: {
        '/users': {
          get: {
            operationId: 'getUsers',
            summary: 'Get users',
            tags: ['User Management'],
            responses: {
              200: {
                description: 'Success'
              }
            }
          }
        },
        '/posts': {
          get: {
            operationId: 'getPosts',
            summary: 'Get posts',
            tags: ['User Management'],
            responses: {
              200: {
                description: 'Success'
              }
            }
          }
        }
      }
    };

    const result = openApiToBruno(JSON.stringify(openApiSpec));
    // Find the folder created from the tag - spaces replaced with underscores
    const folder = findFolderByName(result.items, 'User_Management');
    expect(folder).toBeDefined();
    expect(folder.name).toBe('User_Management');
    expect(folder.items).toHaveLength(2);
  });

  it('should sanitize folder names from tags with dots', () => {
    const openApiSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0'
      },
      paths: {
        '/users': {
          get: {
            operationId: 'getUsers',
            summary: 'Get users',
            tags: ['api.v1'],
            responses: {
              200: {
                description: 'Success'
              }
            }
          }
        }
      }
    };

    const result = openApiToBruno(JSON.stringify(openApiSpec));
    // Find the folder created from the tag - dots should be replaced
    const folder = findFolderByName(result.items, 'api_v1');
    expect(folder).toBeDefined();
    expect(folder.name).toBe('api_v1');
  });

  it('should handle utf characters as well', () => {
    const openApiSpec = {
      openapi: '3.0.1',
      info: {
        title: 'CBC-MODEL3D-API',
        description: 'POWER BY WARE4U',
        termsOfService: 'http://swagger.io/terms/',
        contact: {
          name: '陈洪',
          email: 'sendreams@hotmail.com'
        },
        license: {
          name: 'Apache 2.0',
          url: 'http://springdoc.org'
        },
        version: '1.0.0'
      },
      tags: [
        {
          name: '模型管理',
          description: '发布和管理3d模型'
        },
        {
          name: '模型集市',
          description: '模型查询、评价、下单等'
        }
      ],
      paths: {
        '/users': {
          get: {
            operationId: 'getUsers',
            summary: 'Get users',
            tags: ['模型管理'],
            responses: {
              200: {
                description: 'Success'
              }
            }
          }
        }
      }
    };

    const result = openApiToBruno(JSON.stringify(openApiSpec));
    const folder = findFolderByName(result.items, '模型管理');
    expect(folder).toBeDefined();
  });
});
