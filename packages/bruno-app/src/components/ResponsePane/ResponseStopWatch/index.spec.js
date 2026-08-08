import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import ResponseStopWatch from './index';

const theme = {
  font: { size: { sm: '0.875rem' } },
  requestTabPanel: { responseStatus: '#000' }
};

const renderStopWatch = (props) => render(
  <ThemeProvider theme={theme}>
    <ResponseStopWatch {...props} />
  </ThemeProvider>
);

describe('ResponseStopWatch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-28T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('derives elapsed time from the request start timestamp', () => {
    const startTime = Date.now() - 1500;

    renderStopWatch({ startTime, startMillis: 200 });

    expect(screen.getByText('1.5s')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByText('2.0s')).toBeInTheDocument();
  });

  it('preserves elapsed time after unmounting and remounting', () => {
    const startTime = Date.now() - 1000;
    const firstRender = renderStopWatch({ startTime, startMillis: 100 });

    expect(screen.getByText('1.0s')).toBeInTheDocument();
    firstRender.unmount();

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    renderStopWatch({ startTime, startMillis: 100 });

    expect(screen.getByText('3.0s')).toBeInTheDocument();
  });

  it('continues from the supplied duration when start time is unavailable', () => {
    renderStopWatch({ startMillis: 400 });

    expect(screen.getByText('0.4s')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(screen.getByText('0.7s')).toBeInTheDocument();
  });

  it('does not display a negative duration for a future start timestamp', () => {
    renderStopWatch({ startTime: Date.now() + 1000, startMillis: 400 });

    expect(screen.getByText('0.0s')).toBeInTheDocument();
  });

  it('uses a request start timestamp received after the initial render', () => {
    const { rerender } = renderStopWatch({ startMillis: 200 });

    expect(screen.getByText('0.2s')).toBeInTheDocument();

    const startTime = Date.now() - 1500;
    rerender(
      <ThemeProvider theme={theme}>
        <ResponseStopWatch startTime={startTime} startMillis={200} />
      </ThemeProvider>
    );

    expect(screen.getByText('1.5s')).toBeInTheDocument();
  });
});
