import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import JsonPreview from './JsonPreview';

describe('JsonPreview', () => {
  it('should call onLinkClick when a URL string value is clicked', () => {
    const onLinkClick = jest.fn();
    const url = 'https://example-bucket.s3.us-east-2.amazonaws.com/upload.bin?X-Amz-Algorithm=AWS4-HMAC-SHA256&x-id=PutObject';
    const { container } = render(
      <JsonPreview
        data={{ presignedURL: url }}
        displayedTheme="light"
        onLinkClick={onLinkClick}
      />
    );

    const valueElement = Array.from(container.querySelectorAll('.variable-value'))
      .find((element) => element.textContent.includes(url));

    expect(valueElement).toBeInTheDocument();
    fireEvent.click(valueElement);

    expect(onLinkClick).toHaveBeenCalledTimes(1);
    expect(onLinkClick).toHaveBeenCalledWith(url);
  });

  it('should not call onLinkClick when a non-URL string value is clicked', () => {
    const onLinkClick = jest.fn();
    const { container } = render(
      <JsonPreview
        data={{ message: 'not a url' }}
        displayedTheme="light"
        onLinkClick={onLinkClick}
      />
    );

    const valueElement = Array.from(container.querySelectorAll('.variable-value'))
      .find((element) => element.textContent.includes('not a url'));

    expect(valueElement).toBeInTheDocument();
    fireEvent.click(valueElement);

    expect(onLinkClick).not.toHaveBeenCalled();
  });
});
