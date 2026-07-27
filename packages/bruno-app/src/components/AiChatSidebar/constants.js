export const PROCESSING_STAGES = [
  { id: 'sending', label: 'Sending request', icon: 'send' },
  { id: 'thinking', label: 'AI is thinking', icon: 'sparkles' },
  { id: 'generating', label: 'Generating response', icon: 'wand' },
  { id: 'applying', label: 'Preparing changes', icon: 'code' }
];

export const CONTENT_TYPE_LABELS = {
  'app': 'App',
  'tests': 'Tests',
  'pre-request': 'Script',
  'post-response': 'Script',
  'docs': 'Docs'
};

export const SUGGESTIONS_BY_TYPE = {
  'app': [
    { label: 'Create a form for this request', prompt: 'Create a simple form to send this request' },
    { label: 'Add a loading spinner', prompt: 'Add a loading spinner while the request is pending' },
    { label: 'Show response in a table', prompt: 'Display the response data in a table' },
    { label: 'Add error handling', prompt: 'Add error handling with user-friendly messages' }
  ],
  'tests': [
    { label: 'Generate basic tests', prompt: 'Generate tests for status code, response body, and headers' },
    { label: 'Test response structure', prompt: 'Write tests to validate the response body structure and data types' },
    { label: 'Test error cases', prompt: 'Write tests for common error scenarios' },
    { label: 'Test response time', prompt: 'Add a test to verify response time is acceptable' }
  ],
  'pre-request': [
    { label: 'Add authentication', prompt: 'Add authorization header from environment variable' },
    { label: 'Set dynamic variables', prompt: 'Set dynamic request variables like timestamp or unique ID' },
    { label: 'Conditional logic', prompt: 'Add conditional logic to modify the request based on environment' }
  ],
  'post-response': [
    { label: 'Extract to variables', prompt: 'Extract data from response and save to environment variables' },
    { label: 'Store auth token', prompt: 'Extract auth token from response and save for future requests' },
    { label: 'Log response', prompt: 'Log response status and body for debugging' },
    { label: 'Transform response', prompt: 'Transform and process the response data' }
  ],
  'docs': [
    { label: 'Generate full docs', prompt: 'Generate comprehensive API documentation for this endpoint' },
    { label: 'Document parameters', prompt: 'Document all request parameters, headers, and body' },
    { label: 'Add examples', prompt: 'Add request and response examples' },
    { label: 'Document errors', prompt: 'Document common error responses and status codes' }
  ]
};

export const PLACEHOLDER_BY_TYPE = {
  'tests': { empty: 'Describe the tests you want...', filled: 'Ask to modify or add tests...' },
  'pre-request': { empty: 'Describe the script you want...', filled: 'Ask to modify the script...' },
  'post-response': { empty: 'Describe the script you want...', filled: 'Ask to modify the script...' },
  'docs': { empty: 'Describe the documentation...', filled: 'Ask to update the docs...' },
  'app': { empty: 'Describe the app you want to create...', filled: 'Ask to modify your app...' }
};
