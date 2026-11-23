import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import InlineLayout from './index';

describe('InlineLayout', () => {
  it('keeps the footer out of the scrolling area', () => {
    render(
      <ThemeProvider theme={themes.light}>
        <InlineLayout confirmText="Open" handleConfirm={jest.fn()} handleCancel={jest.fn()} footerLeft={<span>0 of 30 selected</span>}>
          <div data-testid="content">content</div>
        </InlineLayout>
      </ThemeProvider>
    );

    const root = screen.getByTestId('clone-git-inline-layout');
    const body = screen.getByTestId('content').parentElement;
    const footer = screen.getByTestId('clone-git-inline-footer');

    expect(root).toHaveClass('flex', 'flex-col', 'flex-1', 'min-h-0');
    expect(body).toHaveClass('flex-1', 'min-h-0', 'overflow-y-auto');
    expect(footer).toHaveClass('shrink-0');
    expect(footer.parentElement).toBe(root);
    expect(body.contains(footer)).toBe(false);
  });

  it('styles checkboxes like the modal in the inline layout', () => {
    render(
      <ThemeProvider theme={themes.light}>
        <InlineLayout confirmText="Open" handleConfirm={jest.fn()} handleCancel={jest.fn()}>
          <input type="checkbox" className="checkbox" data-testid="cb" />
        </InlineLayout>
      </ThemeProvider>
    );

    const style = getComputedStyle(screen.getByTestId('cb'));
    expect(style.appearance).toBe('none');
    expect(style.background).toBe('transparent');
  });
});
