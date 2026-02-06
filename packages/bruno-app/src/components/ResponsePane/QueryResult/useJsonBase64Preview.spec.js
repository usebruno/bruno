import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import useJsonBase64Preview from './useJsonBase64Preview';

const HookHarness = React.forwardRef((props, ref) => {
  const result = useJsonBase64Preview(props);

  React.useImperativeHandle(ref, () => ({
    setPath: result.setBinarySourcePath
  }));

  return (
    <div data-testid="mime">
      {result.binaryMimeType || ''}
    </div>
  );
});

HookHarness.displayName = 'HookHarness';

const createProps = (data) => ({
  data,
  dataBuffer: '',
  selectedFormat: 'base64',
  selectedTab: 'preview',
  isEnabled: true
});

const sampleBase64 = 'dGhpcyBpcyBhIHRlc3QgZGF0YSBwYXlsb2Fk';

describe('useJsonBase64Preview', () => {
  it('derives mimeType from array entries containing base64', () => {
    const data = [{ mimeType: 'image/png', data: sampleBase64 }];
    const ref = React.createRef();

    render(<HookHarness ref={ref} {...createProps(data)} />);

    expect(screen.getByTestId('mime')).toHaveTextContent('image/png');
  });

  it('resolves mimeType from parent when JSONPath selects base64 string', () => {
    const data = [{ mimeType: 'image/png', data: sampleBase64 }];
    const ref = React.createRef();

    render(<HookHarness ref={ref} {...createProps(data)} />);

    act(() => {
      ref.current.setPath('$[0].data');
    });

    expect(screen.getByTestId('mime')).toHaveTextContent('image/png');
  });
});
