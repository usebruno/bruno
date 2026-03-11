import { validateItem, validateCollection } from './validate';

describe('validateItem', () => {
  it('should return empty array for item with no scripts', () => {
    const item = { type: 'http-request', request: {} };
    expect(validateItem(item)).toEqual([]);
  });

  it('should return empty array for null item', () => {
    expect(validateItem(null)).toEqual([]);
  });

  it('should detect pm.* in pre-request script of a request', () => {
    const item = {
      type: 'http-request',
      request: {
        script: {
          req: 'pm.vault.get("secret")',
          res: ''
        }
      }
    };
    const warnings = validateItem(item);
    expect(warnings.length).toBe(1);
    expect(warnings[0].ruleId).toBe('untranslated-pm-api');
    expect(warnings[0].type).toBe('untranslated-api');
    expect(warnings[0].location).toBe('pre-request-script');
    expect(warnings[0].message).toContain('pre-request script');
    expect(warnings[0].message).toContain('pm.vault.get');
    expect(warnings[0].line).toBe(1);
  });

  it('should detect postman.* in post-response script', () => {
    const item = {
      type: 'http-request',
      request: {
        script: {
          req: '',
          res: 'postman.setNextRequest("name")'
        }
      }
    };
    const warnings = validateItem(item);
    expect(warnings.length).toBe(1);
    expect(warnings[0].location).toBe('post-response-script');
    expect(warnings[0].message).toContain('post-response script');
    expect(warnings[0].message).toContain('postman.setNextRequest');
    expect(warnings[0].line).toBe(1);
  });

  it('should detect pm.* in tests field', () => {
    const item = {
      type: 'http-request',
      request: {
        script: { req: '', res: '' },
        tests: 'pm.test("status", function() { pm.response.to.have.status(200) })'
      }
    };
    const warnings = validateItem(item);
    expect(warnings.length).toBe(2);
    expect(warnings[0].location).toBe('tests');
    expect(warnings[0].message).toContain('tests');
    expect(warnings[0].message).toContain('pm.test');
  });

  it('should detect pm.* in folder root tests field', () => {
    const item = {
      type: 'folder',
      root: {
        request: {
          script: { req: '', res: '' },
          tests: 'pm.environment.get("key")'
        }
      }
    };
    const warnings = validateItem(item);
    expect(warnings.length).toBe(1);
    expect(warnings[0].location).toBe('tests');
    expect(warnings[0].message).toContain('tests');
  });

  it('should detect multiple pm APIs', () => {
    const item = {
      type: 'http-request',
      request: {
        script: {
          req: 'pm.vault.get("x"); pm.iterationData.get("y")',
          res: 'pm.cookies.get("z")'
        }
      }
    };
    const warnings = validateItem(item);
    expect(warnings.length).toBe(3);
    expect(warnings[0].location).toBe('pre-request-script');
    expect(warnings[1].location).toBe('pre-request-script');
    expect(warnings[2].location).toBe('post-response-script');
  });

  it('should detect pm.* in folder root scripts', () => {
    const item = {
      type: 'folder',
      root: {
        request: {
          script: {
            req: 'pm.vault.get("secret")',
            res: ''
          }
        }
      }
    };
    const warnings = validateItem(item);
    expect(warnings.length).toBe(1);
    expect(warnings[0].location).toBe('pre-request-script');
    expect(warnings[0].message).toContain('pm.vault.get');
  });

  it('should return empty array for clean scripts', () => {
    const item = {
      type: 'http-request',
      request: {
        script: {
          req: 'const x = bru.getVar("test");',
          res: 'bru.setVar("result", res.body);'
        }
      }
    };
    expect(validateItem(item)).toEqual([]);
  });

  it('should ignore pm APIs in single-line comments', () => {
    const item = {
      type: 'http-request',
      request: {
        script: {
          req: '// pm.vault.get("secret")',
          res: ''
        }
      }
    };
    expect(validateItem(item)).toEqual([]);
  });

  it('should ignore pm APIs in block comments', () => {
    const item = {
      type: 'http-request',
      request: {
        script: {
          req: '/* pm.vault.get("secret") */',
          res: ''
        }
      }
    };
    expect(validateItem(item)).toEqual([]);
  });

  it('should still detect pm APIs on lines with trailing comments', () => {
    const item = {
      type: 'http-request',
      request: {
        script: {
          req: 'pm.vault.get("secret"); // fetch secret',
          res: ''
        }
      }
    };
    const warnings = validateItem(item);
    expect(warnings.length).toBe(1);
    expect(warnings[0].message).toContain('pm.vault.get');
  });

  it('should not match pm inside string literals', () => {
    const item = {
      type: 'http-request',
      request: {
        script: {
          req: 'const msg = "pm.vault.get is not supported";',
          res: ''
        }
      }
    };
    expect(validateItem(item)).toEqual([]);
  });

  it('should report correct line numbers for multi-line scripts', () => {
    const item = {
      type: 'http-request',
      request: {
        script: {
          req: 'const x = 1;\nconst y = 2;\npm.vault.get("secret");\nconst z = 3;\npm.iterationData.get("key");',
          res: ''
        }
      }
    };
    const warnings = validateItem(item);
    expect(warnings.length).toBe(2);
    expect(warnings[0].message).toContain('pm.vault.get');
    expect(warnings[0].line).toBe(3);
    expect(warnings[1].message).toContain('pm.iterationData.get');
    expect(warnings[1].line).toBe(5);
  });

  it('should report line 1 for API on first line', () => {
    const item = {
      type: 'http-request',
      request: {
        script: {
          req: 'pm.vault.get("secret");\nconst x = 1;',
          res: ''
        }
      }
    };
    const warnings = validateItem(item);
    expect(warnings.length).toBe(1);
    expect(warnings[0].line).toBe(1);
  });

  it('should report correct line numbers with comments on earlier lines', () => {
    const item = {
      type: 'http-request',
      request: {
        script: {
          req: '// pm.vault.get("ignored")\nconst x = 1;\npm.cookies.get("key");',
          res: ''
        }
      }
    };
    const warnings = validateItem(item);
    expect(warnings.length).toBe(1);
    expect(warnings[0].message).toContain('pm.cookies.get');
    expect(warnings[0].line).toBe(3);
  });
});

describe('validateCollection', () => {
  it('should validate all items in collection tree', () => {
    const collection = {
      uid: 'col-1',
      root: {
        request: {
          script: {
            req: 'pm.globals.set("x", 1)',
            res: ''
          }
        }
      },
      items: [
        {
          uid: 'req-1',
          type: 'http-request',
          request: {
            script: {
              req: '',
              res: 'pm.test("ok", () => {})'
            }
          }
        },
        {
          uid: 'folder-1',
          type: 'folder',
          root: {
            request: {
              script: { req: '', res: '' }
            }
          },
          items: [
            {
              uid: 'req-2',
              type: 'http-request',
              request: {
                script: { req: '', res: '' }
              }
            }
          ]
        }
      ]
    };

    const warningsMap = validateCollection(collection);
    expect(Object.keys(warningsMap)).toEqual(['col-1', 'req-1']);
    expect(warningsMap['col-1'].length).toBe(1);
    expect(warningsMap['req-1'].length).toBe(1);
    // req-2 and folder-1 have no warnings
    expect(warningsMap['req-2']).toBeUndefined();
    expect(warningsMap['folder-1']).toBeUndefined();
  });

  it('should return empty map for clean collection', () => {
    const collection = {
      uid: 'col-1',
      root: { request: { script: { req: '', res: '' } } },
      items: [
        {
          uid: 'req-1',
          type: 'http-request',
          request: { script: { req: '', res: '' } }
        }
      ]
    };

    const warningsMap = validateCollection(collection);
    expect(Object.keys(warningsMap)).toEqual([]);
  });
});
