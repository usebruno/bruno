import React from 'react';
import { render, screen } from '@testing-library/react';
import Network from './index';

describe('Network component', () => {
  describe('NetworkLogsEntry message rendering', () => {
    it('should render string messages correctly', () => {
      const logs = [
        { type: 'info', message: 'Test message' },
        { type: 'request', message: 'GET https://example.com' }
      ];

      render(<Network logs={logs} />);

      expect(screen.getByText('Test message')).toBeInTheDocument();
      expect(screen.getByText('GET https://example.com')).toBeInTheDocument();
    });

    it('should render object messages as JSON string, not [object Object]', () => {
      // This test simulates the bug reported in issue #6505
      // When safeStringifyJSON fails in the backend, it returns an object
      // instead of a string, which then gets stored in the message field
      const objectMessage = { error: 'Something went wrong', details: { code: 500 } };
      const logs = [{ type: 'error', message: objectMessage }];

      render(<Network logs={logs} />);

      // The component should NOT render [object Object]
      const objectObjectText = screen.queryByText('[object Object]');
      expect(objectObjectText).not.toBeInTheDocument();

      // Instead, it should render the stringified JSON
      expect(screen.getByText(/error.*Something went wrong/)).toBeInTheDocument();
    });

    it('should handle null message gracefully', () => {
      const logs = [{ type: 'info', message: null }];

      render(<Network logs={logs} />);

      // Should not crash or show [object Object]
      expect(screen.queryByText('[object Object]')).not.toBeInTheDocument();
    });

    it('should handle undefined message gracefully', () => {
      const logs = [{ type: 'info', message: undefined }];

      render(<Network logs={logs} />);

      // Should not crash or show [object Object]
      expect(screen.queryByText('[object Object]')).not.toBeInTheDocument();
    });

    it('should apply correct CSS class based on log type', () => {
      const logs = [
        { type: 'request', message: 'Request log' },
        { type: 'response', message: 'Response log' },
        { type: 'error', message: 'Error log' }
      ];

      const { container } = render(<Network logs={logs} />);

      expect(container.querySelector('.text-blue-500')).toBeInTheDocument();
      expect(container.querySelector('.text-green-500')).toBeInTheDocument();
      expect(container.querySelector('.text-red-500')).toBeInTheDocument();
    });
  });
});
