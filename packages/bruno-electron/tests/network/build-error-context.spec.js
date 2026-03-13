const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { buildErrorContext } = require('../../src/ipc/network/build-error-context');

// Wrapper offsets: QuickJS = 9, NodeVM = 2

// Line numbers annotated for reference:
// 13: script:pre-request {        → blockStartLine = 14
// 14:   const token = ...          → script line 1
// 18: script:post-response {      → blockStartLine = 19
// 19:   const data = res.body;     → script line 1
// 20:   bru.setVar(...)            → script line 2
// 21:   console.log(data);         → script line 3
// 24: tests {                     → blockStartLine = 25
// 25:   test("status is 200"...)   → script line 1
const MULTI_BLOCK_BRU = `meta {
  name: multi-block-test
  type: http
  seq: 1
}

get {
  url: https://example.com
  body: none
  auth: none
}

script:pre-request {
  const token = bru.getEnvVar('token');
  req.setHeader('Authorization', token);
}

script:post-response {
  const data = res.body;
  bru.setVar('userId', data.id);
  console.log(data);
}

tests {
  test("status is 200", function() {
    expect(res.status).to.equal(200);
  });
  test("has body", function() {
    expect(res.body).to.not.be.null;
  });
}`;

// YML fixture: blockStartLine = 8 (pre-request), 12 (post-response), 16 (tests)
const MULTI_BLOCK_YML = [
  'info:',
  '  name: yaml-test',
  '  version: "1"',
  'runtime:',
  '  scripts:',
  '    - type: before-request',
  '      code: |-',
  '        const token = bru.getEnvVar(\'token\');',
  '        req.setHeader(\'Authorization\', token);',
  '    - type: after-response',
  '      code: |-',
  '        const data = res.body;',
  '        bru.setVar(\'userId\', data.id);',
  '    - type: tests',
  '      code: |-',
  '        test("status is 200", function() {',
  '          expect(res.status).to.equal(200);',
  '        });'
].join('\n');

// Collection YML for segment resolution tests
// blockStartLine: before-request = 5, tests = 9
const COLLECTION_YML = [
  'info:',
  '  name: test-collection',
  'request:',
  '  scripts:',
  '    - type: before-request',
  '      code: |-',
  '        const abc = fc()',
  '        const x = bru.getVar(\'x\');',
  '    - type: tests',
  '      code: |-',
  '        test("example", function() {',
  '          expect(true).to.be.true;',
  '        });'
].join('\n');

const makeCallSiteError = (filePath, line, message = 'test error', name = 'Error') => {
  const error = new Error(message);
  error.name = name;
  error.__callSites = [{ filePath, line, column: 1 }];
  error.stack = `${name}: ${message}\n    at Object.<anonymous> (${filePath}:${line}:1)`;
  return error;
};

const makeQuickJSError = (filePath, line, message = 'test error', name = 'Error') => {
  const error = new Error(message);
  error.name = name;
  error.__isQuickJS = true;
  error.stack = `${name}: ${message}\n    at <anonymous> (${filePath}:${line})`;
  return error;
};

describe('buildErrorContext', () => {
  let testDir;
  let bruFilePath;
  let ymlFilePath;
  let collectionYmlPath;
  let consoleSpy;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-bec-'));
    bruFilePath = path.join(testDir, 'test.bru');
    ymlFilePath = path.join(testDir, 'test.yml');
    collectionYmlPath = path.join(testDir, 'collection.yml');
    fs.writeFileSync(bruFilePath, MULTI_BLOCK_BRU);
    fs.writeFileSync(ymlFilePath, MULTI_BLOCK_YML);
    fs.writeFileSync(collectionYmlPath, COLLECTION_YML);
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    consoleSpy.mockRestore();
  });

  describe('null/falsy error input', () => {
    it('should return null for null error', () => {
      expect(buildErrorContext(null, 'pre-request', bruFilePath, testDir)).toBeNull();
    });

    it('should return null for undefined error', () => {
      expect(buildErrorContext(undefined, 'pre-request', bruFilePath, testDir)).toBeNull();
    });

    it('should return null for error without parseable location', () => {
      const error = new Error('no location');
      error.stack = '';
      expect(buildErrorContext(error, 'pre-request', bruFilePath, testDir)).toBeNull();
    });
  });

  describe('.bru file errors', () => {
    it('should produce correct block-relative line numbers for pre-request (NodeVM)', () => {
      // NodeVM offset = 2, script line 1 → VM line 3
      // blockStartLine for pre-request = 14, so adjusted = 14 + (3-2) - 1 = 14
      // block-relative = 14 - (14-1) = 1
      const error = makeCallSiteError(bruFilePath, 3, 'token is not defined', 'ReferenceError');
      const result = buildErrorContext(error, 'pre-request', bruFilePath, testDir);

      expect(result).not.toBeNull();
      expect(result.errorType).toBe('ReferenceError');
      expect(result.errorLine).toBe(1);
      expect(result.filePath).toBe('test.bru');
      expect(result.lines.length).toBeGreaterThan(0);
      expect(result.lines.every((l) => l.lineNumber >= 1)).toBe(true);
    });

    it('should produce correct block-relative line numbers for post-response (NodeVM)', () => {
      // NodeVM offset = 2, script line 2 → VM line 4
      // blockStartLine for post-response = 19, adjusted = 19 + (4-2) - 1 = 20
      // block-relative = 20 - (19-1) = 2
      const error = makeCallSiteError(bruFilePath, 4, 'data is not defined', 'ReferenceError');
      const result = buildErrorContext(error, 'post-response', bruFilePath, testDir);

      expect(result).not.toBeNull();
      expect(result.errorLine).toBe(2);
      expect(result.filePath).toBe('test.bru');
    });

    it('should produce correct block-relative line numbers for tests (NodeVM)', () => {
      // NodeVM offset = 2, script line 1 → VM line 3
      // blockStartLine for tests = 25, adjusted = 25 + (3-2) - 1 = 25
      // block-relative = 25 - (25-1) = 1
      const error = makeCallSiteError(bruFilePath, 3, 'assertion failed');
      const result = buildErrorContext(error, 'test', bruFilePath, testDir);

      expect(result).not.toBeNull();
      expect(result.errorLine).toBe(1);
    });

    it('should handle QuickJS errors with correct offset', () => {
      // QuickJS offset = 9, script line 1 → VM line 10
      // blockStartLine for post-response = 19, adjusted = 19 + (10-9) - 1 = 19
      // block-relative = 19 - (19-1) = 1
      const error = makeQuickJSError(bruFilePath, 10, 'data is not defined', 'ReferenceError');
      const result = buildErrorContext(error, 'post-response', bruFilePath, testDir);

      expect(result).not.toBeNull();
      expect(result.errorLine).toBe(1);
      expect(result.errorType).toBe('ReferenceError');
    });
  });

  describe('.yml file errors', () => {
    it('should produce correct block-relative line numbers for pre-request (NodeVM)', () => {
      // NodeVM offset = 2, script line 1 → VM line 3
      // ymlBlockStartLine for pre-request = 8, adjusted = 8 + (3-2) - 1 = 8
      // block-relative = 8 - (8-1) = 1
      const error = makeCallSiteError(ymlFilePath, 3, 'token error');
      const result = buildErrorContext(error, 'pre-request', ymlFilePath, testDir);

      expect(result).not.toBeNull();
      expect(result.errorLine).toBe(1);
      expect(result.filePath).toBe('test.yml');
    });

    it('should produce correct block-relative line numbers for post-response (NodeVM)', () => {
      // NodeVM offset = 2, script line 1 → VM line 3
      // ymlBlockStartLine for post-response = 12, adjusted = 12 + (3-2) - 1 = 12
      // block-relative = 12 - (12-1) = 1
      const error = makeCallSiteError(ymlFilePath, 3, 'data error');
      const result = buildErrorContext(error, 'post-response', ymlFilePath, testDir);

      expect(result).not.toBeNull();
      expect(result.errorLine).toBe(1);
    });
  });

  describe('segment resolution (collection/folder scripts)', () => {
    it('should resolve errors in collection script segments', () => {
      // Error on line 2 of collection pre-request script
      // NodeVM offset = 2, scriptRelativeLine = 4 - 2 = 2
      // Segment startLine=1, endLine=4: 2 is in range
      // resolveSegmentError maps: blockStartLine + (2 - 1) - 1 = blockStartLine
      // Then buildErrorContext computes block-relative errorLine = 1
      const metadata = {
        requestStartLine: 5,
        requestEndLine: 8,
        segments: [{
          startLine: 1,
          endLine: 4,
          filePath: collectionYmlPath,
          displayPath: 'collection.yml'
        }]
      };

      const error = makeCallSiteError(bruFilePath, 4, 'x is not defined', 'ReferenceError');
      const result = buildErrorContext(error, 'pre-request', bruFilePath, testDir, metadata);

      expect(result).not.toBeNull();
      expect(result.filePath).toBe('collection.yml');
      expect(result.errorLine).toBe(1);
    });

    it('should return null when segment resolution fails', () => {
      const metadata = {
        requestStartLine: 5,
        requestEndLine: 8,
        segments: []
      };

      // Error at line outside request range → adjustLineNumber returns null
      // Empty segments → resolveSegmentError returns null
      const error = makeCallSiteError(bruFilePath, 3, 'error');
      const result = buildErrorContext(error, 'pre-request', bruFilePath, testDir, metadata);

      expect(result).toBeNull();
    });
  });

  describe('stack trace extraction', () => {
    it('should extract only "at" frames with indentation', () => {
      const error = makeCallSiteError(bruFilePath, 3, 'test error', 'Error');
      const result = buildErrorContext(error, 'pre-request', bruFilePath, testDir);

      expect(result).not.toBeNull();
      if (result.stack) {
        const lines = result.stack.split('\n');
        lines.forEach((line) => {
          expect(line).toMatch(/^\s+at /);
        });
      }
    });

    it('should return stack as null when error has no stack', () => {
      const error = makeCallSiteError(bruFilePath, 3, 'test error');
      delete error.stack;
      const result = buildErrorContext(error, 'pre-request', bruFilePath, testDir);

      expect(result).not.toBeNull();
      expect(result.stack).toBeNull();
    });

    it('should return stack as null when stack has no "at" frames', () => {
      const error = makeCallSiteError(bruFilePath, 3, 'test error');
      error.stack = 'Error: test error\nsome other info';
      const result = buildErrorContext(error, 'pre-request', bruFilePath, testDir);

      expect(result).not.toBeNull();
      expect(result.stack).toBeNull();
    });
  });

  describe('context lines filtering', () => {
    it('should filter lines to block boundaries', () => {
      // pre-request block in the .bru fixture: lines 14-15 (2 lines of content)
      // blockStartLine = 14, blockEndLine = 15, blockOffset = 13
      const error = makeCallSiteError(bruFilePath, 3, 'error');
      const result = buildErrorContext(error, 'pre-request', bruFilePath, testDir);

      expect(result).not.toBeNull();
      result.lines.forEach((l) => {
        expect(l.lineNumber).toBeGreaterThanOrEqual(1);
      });
    });

    it('should mark the error line correctly', () => {
      const error = makeCallSiteError(bruFilePath, 3, 'error');
      const result = buildErrorContext(error, 'pre-request', bruFilePath, testDir);

      expect(result).not.toBeNull();
      const errorLines = result.lines.filter((l) => l.isError);
      expect(errorLines.length).toBe(1);
      expect(errorLines[0].lineNumber).toBe(result.errorLine);
    });

    it('should return null when all context lines are filtered out', () => {
      // Create a .bru file with an empty script block
      const emptyBru = `meta {
  name: empty-test
  type: http
  seq: 1
}

script:pre-request {
}`;
      const emptyBruPath = path.join(testDir, 'empty.bru');
      fs.writeFileSync(emptyBruPath, emptyBru);

      // Even though the block exists, there are no content lines inside it
      // The error line would point to the opening brace line or outside the block
      // This tests the filteredLines.length === 0 guard
      const error = makeCallSiteError(emptyBruPath, 3, 'error');
      const result = buildErrorContext(error, 'pre-request', emptyBruPath, testDir);

      // With an empty block, block start and end don't contain any valid content lines
      // so result should be null (either from getSourceContext or the filter guard)
      expect(result).toBeNull();
    });
  });

  describe('external JS file errors (no block offset)', () => {
    it('should use absolute line numbers for non-.bru/.yml files', () => {
      const jsFilePath = path.join(testDir, 'helper.js');
      fs.writeFileSync(jsFilePath, 'function foo() {\n  throw new Error("oops");\n}\nfoo();\n');

      const error = makeCallSiteError(jsFilePath, 2, 'oops');
      const result = buildErrorContext(error, 'pre-request', bruFilePath, testDir);

      expect(result).not.toBeNull();
      // No block offset for JS files → line numbers are absolute
      expect(result.errorLine).toBe(2);
      // displayPath uses itemPathname (bruFilePath) since it's always set by callers
      expect(result.filePath).toBe('test.bru');
    });
  });

  describe('scriptMetadata precedence', () => {
    it('should prefer error.scriptMetadata over parameter when non-empty', () => {
      const errorMetadata = {
        requestStartLine: 1,
        requestEndLine: 2
      };
      const paramMetadata = {
        requestStartLine: 10,
        requestEndLine: 20
      };

      const error = makeCallSiteError(bruFilePath, 3, 'error');
      error.scriptMetadata = errorMetadata;
      const result = buildErrorContext(error, 'pre-request', bruFilePath, testDir, paramMetadata);

      // Should use error.scriptMetadata since it's non-empty
      expect(result).not.toBeNull();
    });

    it('should fall back to parameter when error.scriptMetadata is empty object', () => {
      const paramMetadata = {
        requestStartLine: 1,
        requestEndLine: 2
      };

      const error = makeCallSiteError(bruFilePath, 3, 'error');
      error.scriptMetadata = {};
      const result = buildErrorContext(error, 'pre-request', bruFilePath, testDir, paramMetadata);

      // Should use paramMetadata since error.scriptMetadata is empty
      expect(result).not.toBeNull();
    });

    it('should fall back to parameter when error.scriptMetadata is null', () => {
      const paramMetadata = {
        requestStartLine: 1,
        requestEndLine: 2
      };

      const error = makeCallSiteError(bruFilePath, 3, 'error');
      error.scriptMetadata = null;
      const result = buildErrorContext(error, 'pre-request', bruFilePath, testDir, paramMetadata);

      expect(result).not.toBeNull();
    });
  });

  describe('error type extraction', () => {
    it('should extract error type from error.name', () => {
      const error = makeCallSiteError(bruFilePath, 3, 'x is not defined', 'ReferenceError');
      const result = buildErrorContext(error, 'pre-request', bruFilePath, testDir);

      expect(result).not.toBeNull();
      expect(result.errorType).toBe('ReferenceError');
    });

    it('should extract error type from error.cause.name', () => {
      const error = makeCallSiteError(bruFilePath, 3, 'wrapped error');
      error.cause = { name: 'TypeError', message: 'original error' };
      const result = buildErrorContext(error, 'pre-request', bruFilePath, testDir);

      expect(result).not.toBeNull();
      expect(result.errorType).toBe('TypeError');
    });
  });

  describe('display path', () => {
    it('should compute relative display path from itemPathname', () => {
      const error = makeCallSiteError(bruFilePath, 3, 'error');
      const result = buildErrorContext(error, 'pre-request', bruFilePath, testDir);

      expect(result).not.toBeNull();
      expect(result.filePath).toBe('test.bru');
    });

    it('should fall back to raw filePath when itemPathname is null', () => {
      const error = makeCallSiteError(bruFilePath, 3, 'error');
      const result = buildErrorContext(error, 'pre-request', null, testDir);

      expect(result).not.toBeNull();
      expect(result.filePath).toBe(bruFilePath);
    });
  });

  describe('catch block logging', () => {
    it('should log a warning when an internal error occurs', () => {
      // Create an error that will cause an internal failure
      // by making parseErrorLocation return a parsed result pointing to a non-existent file
      // but then getSourceContext will fail because the adjusted line produces invalid state
      const error = new Error('test');
      error.__callSites = [{ filePath: bruFilePath, line: 3, column: 1 }];
      // Sabotage the error object to cause a crash in getErrorTypeName
      Object.defineProperty(error, 'name', {
        get() { throw new Error('property access bomb'); }
      });

      const result = buildErrorContext(error, 'pre-request', bruFilePath, testDir);
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
