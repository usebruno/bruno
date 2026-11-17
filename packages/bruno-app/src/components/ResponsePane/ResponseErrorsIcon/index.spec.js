import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'providers/Theme';
import ResponseErrorsIcon from './index';

const renderIcon = (props) => render(
  <ThemeProvider>
    <ResponseErrorsIcon count={2} onClick={jest.fn()} {...props} />
  </ThemeProvider>
);

describe('ResponseErrorsIcon', () => {
  it('shows the error count as a superscript', () => {
    renderIcon({ count: 3 });

    expect(screen.getByTestId('response-errors-icon-count')).toHaveTextContent('3');
    expect(screen.getByTestId('response-errors-icon')).toHaveAttribute('aria-label', 'Show 3 errors');
  });

  it('calls onClick when pressed', () => {
    const onClick = jest.fn();
    renderIcon({ onClick });

    fireEvent.click(screen.getByTestId('response-errors-icon'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
