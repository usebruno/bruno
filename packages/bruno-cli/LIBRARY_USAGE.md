# Bruno Runner Library

The Bruno Runner has been refactored to provide a clean library interface that can be called externally by other applications multiple times. This allows you to programmatically execute Bruno collections from your own Node.js applications.

## Installation

The Bruno Runner library is part of the `@usebruno/cli` package:

```bash
npm install @usebruno/cli
```

## Basic Usage

### Simple Function-based API (Original)

```javascript
const { runCollection } = require('@usebruno/cli/src/runner/bruno-runner');

async function runMyCollection() {
  try {
    const result = await runCollection({
      collectionPath: '/path/to/your/bruno/collection',
      paths: ['./'],
      recursive: true
    });

    console.log(`Executed ${result.summary.totalRequests} requests`);
    console.log(`Passed: ${result.summary.passedRequests}`);
    console.log(`Failed: ${result.summary.failedRequests}`);
    console.log(`Total time: ${result.totalTime}ms`);

    return result;
  } catch (error) {
    console.error('Collection run failed:', error.message);
    throw error;
  }
}
```

### Event-based API (Newman-like Events)

```javascript
const { BrunoRunner } = require('@usebruno/cli/src/runner/bruno-runner');

async function runMyCollectionWithEvents() {
  const runner = new BrunoRunner();

  // Listen for start event
  runner.on('start', (data) => {
    console.log('🚀 Collection started');
    console.log(`Collection Path: ${data.options.collectionPath}`);
    console.log(`Timestamp: ${data.timestamp}`);
  });

  // Listen for item events (each request)
  runner.on('item', (data) => {
    console.log(`📋 Request: ${data.item.name}`);
    console.log(`Progress: ${data.index + 1}/${data.total}`);
    console.log(`Status: ${data.result.error ? 'FAILED' : 'PASSED'}`);
    if (data.result.response) {
      console.log(`Response Time: ${data.result.response.responseTime}ms`);
      console.log(`Status Code: ${data.result.response.status}`);
    }
  });

  // Listen for done event
  runner.on('done', (data) => {
    console.log('✅ Collection completed');
    console.log(`Duration: ${data.duration}ms`);
    if (data.error) {
      console.log(`Error: ${data.error}`);
    } else {
      console.log(`Total Requests: ${data.summary.totalRequests}`);
      console.log(`Passed: ${data.summary.passedRequests}`);
      console.log(`Failed: ${data.summary.failedRequests}`);
    }
  });

  try {
    const result = await runner.run({
      collectionPath: '/path/to/your/bruno/collection',
      paths: ['./'],
      recursive: true
    });

    return result;
  } catch (error) {
    console.error('Collection run failed:', error.message);
    throw error;
  }
}
```

## Events API

The `BrunoRunner` class extends Node.js `EventEmitter` and provides Newman-like events during collection execution.

### Available Events

#### `start`
Emitted when the collection run begins.

**Event Data:**
```
{
  timestamp: Date,        // When the run started
  options: Object        // The options passed to runner.run()
}
```

#### `item`
Emitted after each request is completed.

**Event Data:**
```
{
  timestamp: Date,        // When the request completed
  item: {                // Information about the request
    name: string,         // Request name
    pathname: string,     // Request file path
    request: Object       // Request configuration
  },
  result: {              // Request execution result
    error: string|null,   // Error message if request failed
    response: {           // Response details (if successful)
      status: number,     // HTTP status code
      responseTime: number, // Response time in milliseconds
      headers: Object,    // Response headers
      data: any          // Response body
    },
    testResults: Array,   // Test execution results
    assertionResults: Array, // Assertion results
    runtime: number       // Total execution time
  },
  index: number,         // Current request index (0-based)
  total: number          // Total number of requests
}
```

#### `done`
Emitted when the collection run completes (success or failure).

**Event Data:**
```
{
  timestamp: Date,        // When the run completed
  duration: number,       // Total run duration in milliseconds
  error: string|null,     // Error message if run failed
  summary: {             // Run summary (null if error occurred)
    totalRequests: number,
    passedRequests: number,
    failedRequests: number,
    skippedRequests: number,
    errorRequests: number,
    totalAssertions: number,
    passedAssertions: number,
    failedAssertions: number,
    totalTests: number,
    passedTests: number,
    failedTests: number
  },
  results: Array,        // Detailed results for each request
  totalTime: number      // Total response time across all requests
}
```

## API Reference

### `runCollection(options)`

Executes a Bruno collection with the specified options.

**Parameters:**
- `options` (Object): Configuration options for the runner

**Returns:**
- `Promise<Object>`: Results object containing summary, results, and totalTime

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `paths` | `string[]` | `['./']` | Paths to run (files or directories) |
| `collectionPath` | `string` | `process.cwd()` | Path to the collection directory |
| `recursive` | `boolean` | `false` | Run recursively through directories |
| `env` | `string` | `undefined` | Environment name to use |
| `envFile` | `string` | `undefined` | Path to environment file |
| `envVar` | `string\|string[]` | `undefined` | Environment variable overrides (format: "name=value") |
| `testsOnly` | `boolean` | `false` | Only run requests with tests |
| `bail` | `boolean` | `false` | Stop on first failure |
| `sandbox` | `string` | `'developer'` | JavaScript sandbox type ('developer' or 'safe') |
| `insecure` | `boolean` | `false` | Allow insecure connections |
| `disableCookies` | `boolean` | `false` | Disable cookie handling |
| `noproxy` | `boolean` | `false` | Disable proxy settings |
| `cacert` | `string` | `undefined` | Path to CA certificate |
| `ignoreTruststore` | `boolean` | `false` | Ignore default truststore |
| `clientCertConfig` | `string` | `undefined` | Path to client certificate config |
| `delay` | `number` | `undefined` | Delay between requests in milliseconds |
| `reporterSkipAllHeaders` | `boolean` | `false` | Skip all headers in results |
| `reporterSkipHeaders` | `string[]` | `[]` | Skip specific headers in results |
| `generateReports` | `Object` | `undefined` | Report generation configuration |

#### Report Generation Configuration

The `generateReports` option allows you to generate various report formats directly from the library:

```
{
  generateReports: {
    json: '/path/to/output.json',      // Generate JSON report
    junit: '/path/to/output.xml',      // Generate JUnit XML report
    html: '/path/to/output.html'       // Generate HTML report
  }
}
```

**Supported Report Formats:**
- `json`: Structured JSON report with summary and detailed results
- `junit`: JUnit XML format compatible with CI/CD systems
- `html`: Interactive HTML report for browser viewing

**Note:** The output directories must exist before generating reports. The library will not create directories automatically.

#### Return Object

```
{
  summary: {
    totalRequests: number,
    passedRequests: number,
    failedRequests: number,
    skippedRequests: number,
    errorRequests: number,
    totalAssertions: number,
    passedAssertions: number,
    failedAssertions: number,
    totalTests: number,
    passedTests: number,
    failedTests: number,
    totalPreRequestTests: number,
    passedPreRequestTests: number,
    failedPreRequestTests: number,
    totalPostResponseTests: number,
    passedPostResponseTests: number,
    failedPostResponseTests: number
  },
  results: Array<Object>, // Detailed results for each request
  totalTime: number // Total execution time in milliseconds
}
```

## Advanced Usage Examples

### Environment Variables

```javascript
const result = await runCollection({
  collectionPath: '/path/to/collection',
  env: 'production',
  envVar: ['API_KEY=secret123', 'BASE_URL=https://api.example.com']
});
```

### Custom Configuration

```javascript
const result = await runCollection({
  collectionPath: '/path/to/collection',
  paths: ['auth/', 'users/'],
  recursive: true,
  testsOnly: true,
  bail: true,
  sandbox: 'safe',
  delay: 1000,
  reporterSkipHeaders: ['Authorization', 'Cookie']
});
```

### Report Generation

```javascript
// Generate multiple report formats
const result = await runCollection({
  collectionPath: '/path/to/collection',
  recursive: true,
  generateReports: {
    json: './reports/results.json',
    junit: './reports/results.xml',
    html: './reports/results.html'
  }
});

// Generate only JSON report
const result2 = await runCollection({
  collectionPath: '/path/to/collection',
  recursive: true,
  generateReports: {
    json: './test-results.json'
  }
});

// CI/CD with JUnit report
const result3 = await runCollection({
  collectionPath: process.env.COLLECTION_PATH,
  env: process.env.TEST_ENV,
  bail: true,
  generateReports: {
    junit: './reports/junit-results.xml'
  }
});
```

### Multiple Collections

```javascript
const collections = [
  '/path/to/collection1',
  '/path/to/collection2',
  '/path/to/collection3'
];

for (const collectionPath of collections) {
  const result = await runCollection({
    collectionPath,
    recursive: true
  });

  console.log(`Collection ${collectionPath}: ${result.summary.totalRequests} requests`);
}
```

### Integration with Testing Frameworks

```javascript
// Jest example
describe('API Tests', () => {
  test('should run Bruno collection successfully', async () => {
    const result = await runCollection({
      collectionPath: './tests/api-collection',
      recursive: true,
      bail: true
    });

    expect(result.summary.failedRequests).toBe(0);
    expect(result.summary.errorRequests).toBe(0);
    expect(result.summary.totalRequests).toBeGreaterThan(0);
  });
});
```

### CI/CD Integration

```javascript
// CI/CD pipeline example
async function runApiTests() {
  try {
    const result = await runCollection({
      collectionPath: process.env.COLLECTION_PATH,
      env: process.env.TEST_ENV,
      bail: true,
      recursive: true
    });

    if (result.summary.failedRequests > 0 || result.summary.errorRequests > 0) {
      console.error('API tests failed');
      process.exit(1);
    }

    console.log('All API tests passed');
    return result;
  } catch (error) {
    console.error('Failed to run API tests:', error.message);
    process.exit(1);
  }
}
```

## Error Handling

The library throws descriptive errors for various failure scenarios:

```javascript
try {
  const result = await runCollection(options);
} catch (error) {
  if (error.message.includes('Collection not found')) {
    // Handle missing collection
  } else if (error.message.includes('Environment file not found')) {
    // Handle missing environment
  } else if (error.message.includes('Too many jumps')) {
    // Handle infinite loop detection
  } else {
    // Handle other errors
  }
}
```

## Differences from CLI

When using the library:
- No console output for request execution (except delay messages)
- Optional file output generation via `generateReports` option
- No process.exit() calls
- Returns structured data instead of printing summaries
- Throws errors instead of exiting with error codes

## Migration from CLI

If you were previously using the CLI programmatically via child processes:

**Before:**
```javascript
const { exec } = require('child_process');

exec('bru run collection/ --env prod', (error, stdout, stderr) => {
  // Parse stdout for results
});
```

**After:**
```javascript
const { runCollection } = require('@usebruno/cli/src/runner/bruno-runner');

const result = await runCollection({
  collectionPath: 'collection/',
  env: 'prod'
});
// Use structured result object
```

## Performance Considerations

- The library can be called multiple times without performance degradation
- Each call creates a fresh execution context
- Memory usage is cleaned up after each run
- Consider using connection pooling for high-frequency usage

## Compatibility

- Node.js 14+ required
- Same Bruno collection format as CLI
- All CLI features supported including report generation
- Environment variables and configuration work identically

For more examples, see the `example-library-usage.js` file in the package directory.
