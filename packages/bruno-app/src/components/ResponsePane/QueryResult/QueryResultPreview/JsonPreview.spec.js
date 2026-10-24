import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import JsonPreview from './JsonPreview';

// MenuDropdown needs the app's styled-components theme and tippy; other
// specs in this codebase mock it the same way and assert on the items.
jest.mock('ui/MenuDropdown', () => ({ children, items }) => (
  <div data-testid="response-json-convert-menu">
    {children}
    {(items || []).map((item) => (
      <button key={item.id} onClick={item.onClick}>
        {item.label}
      </button>
    ))}
  </div>
));

describe('JsonPreview', () => {
  it('should call onLinkClick when a URL string value is selected', () => {
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

  it('should ignore selected string values that are not URLs', () => {
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

  // Container nodes (objects/arrays) carry their key in the brace span;
  // the expand/collapse icon sits beside it.
  const expandNode = (container, key) => {
    const node = Array.from(container.querySelectorAll('.object-key-val')).find((node) => {
      const keyEl = node.querySelector(
        ':scope > span > span > span > .object-key, :scope > span > span > span > .array-key'
      );
      if (!keyEl) {
        return false;
      }
      const text = keyEl.textContent.replace(/"/g, '').replace(/:$/, '').trim();
      return text === String(key);
    });
    expect(node).toBeTruthy();
    const icon = node.querySelector(':scope > span > span > .icon-container');
    expect(icon).toBeTruthy();
    fireEvent.click(icon);
  };

  it('should open the convert menu on right-click of a nested value and report its path', () => {
    const onConvertToTest = jest.fn();
    const onConvertToPostResponse = jest.fn();
    const { container } = render(
      <JsonPreview
        data={{ properties: { latestReportId: 'abc123' } }}
        displayedTheme="light"
        onConvertToTest={onConvertToTest}
        onConvertToPostResponse={onConvertToPostResponse}
      />
    );

    expandNode(container, 'properties');

    const valueElement = Array.from(container.querySelectorAll('.variable-value'))
      .find((element) => element.textContent.includes('abc123'));
    expect(valueElement).toBeInTheDocument();
    fireEvent.contextMenu(valueElement);

    expect(screen.getByText('Convert to test')).toBeInTheDocument();
    expect(screen.getByText('Convert to post-response script')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Convert to test'));

    expect(onConvertToTest).toHaveBeenCalledTimes(1);
    expect(onConvertToTest).toHaveBeenCalledWith(
      expect.objectContaining({ path: ['properties', 'latestReportId'], value: 'abc123' })
    );
    expect(onConvertToPostResponse).not.toHaveBeenCalled();
  });

  it('should report the path when converting to a post-response script', () => {
    const onConvertToTest = jest.fn();
    const onConvertToPostResponse = jest.fn();
    const { container } = render(
      <JsonPreview
        data={{ properties: { latestReportId: 'abc123' } }}
        displayedTheme="light"
        onConvertToTest={onConvertToTest}
        onConvertToPostResponse={onConvertToPostResponse}
      />
    );

    expandNode(container, 'properties');

    const valueElement = Array.from(container.querySelectorAll('.variable-value'))
      .find((element) => element.textContent.includes('abc123'));
    fireEvent.contextMenu(valueElement);

    fireEvent.click(screen.getByText('Convert to post-response script'));

    expect(onConvertToPostResponse).toHaveBeenCalledTimes(1);
    expect(onConvertToPostResponse).toHaveBeenCalledWith(
      expect.objectContaining({ path: ['properties', 'latestReportId'], value: 'abc123' })
    );
    expect(onConvertToTest).not.toHaveBeenCalled();
  });

  it('should resolve array indices in the reported path', () => {
    const onConvertToTest = jest.fn();
    const { container } = render(
      <JsonPreview
        data={{ items: [{ id: 7 }] }}
        displayedTheme="light"
        onConvertToTest={onConvertToTest}
        onConvertToPostResponse={() => {}}
      />
    );

    expandNode(container, 'items');
    expandNode(container, '0');

    const valueElement = Array.from(container.querySelectorAll('.variable-value'))
      .find((element) => element.textContent.includes('7'));
    fireEvent.contextMenu(valueElement);
    fireEvent.click(screen.getByText('Convert to test'));

    expect(onConvertToTest).toHaveBeenCalledWith(
      expect.objectContaining({ path: ['items', 0, 'id'], value: 7 })
    );
  });

  it('should not open a menu when the convert callbacks are not provided', () => {
    const { container } = render(
      <JsonPreview data={{ message: 'hello' }} displayedTheme="light" />
    );

    const valueElement = Array.from(container.querySelectorAll('.variable-value'))
      .find((element) => element.textContent.includes('hello'));
    fireEvent.contextMenu(valueElement);

    expect(screen.queryByText('Convert to test')).not.toBeInTheDocument();
  });
});
