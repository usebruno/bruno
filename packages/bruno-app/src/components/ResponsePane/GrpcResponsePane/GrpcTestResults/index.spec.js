import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import GrpcTestResults, { buildGrpcTestSections, countGrpcTestResults } from './index';

const theme = {
  text: '#333',
  colors: { text: { green: '#16a34a', danger: '#ef4444', muted: '#999' } },
  sidebar: { collection: { item: { hoverBg: '#eee' } }, dropdownIcon: { color: '#666' } }
};

const renderResults = (item) =>
  render(
    <ThemeProvider theme={theme}>
      <GrpcTestResults item={item} sections={buildGrpcTestSections(item)} />
    </ThemeProvider>
  );

const pass = (uid, description, messageIndex) => ({ uid, description, status: 'pass', messageIndex });

describe('buildGrpcTestSections', () => {
  it('covers all four hooks, in the order they run', () => {
    expect(buildGrpcTestSections({}).map(({ key }) => key)).toEqual([
      'beforeCallStart',
      'beforeMessageSend',
      'afterMessageReceive',
      'afterCallEnd'
    ]);
  });

  it('counts the results of every hook', () => {
    const sections = buildGrpcTestSections({
      beforeCallStartTestResults: [pass('r1', 'call opens')],
      afterMessageReceiveTestResults: [pass('r2', 'reply ok', 0), pass('r3', 'reply ok', 1)]
    });

    expect(countGrpcTestResults(sections)).toBe(3);
  });
});

describe('GrpcTestResults', () => {
  it('groups the accumulated message-hook results under the message each came from', () => {
    renderResults({
      uid: 'item-1',
      afterMessageReceiveTestResults: [
        pass('r1', 'first reply is ok', 0),
        pass('r2', 'first reply has an id', 0),
        pass('r3', 'second reply is ok', 1)
      ]
    });

    expect(screen.getByTestId('grpc-test-message-group-0')).toHaveTextContent('Message 1');
    expect(screen.getByTestId('grpc-test-message-group-1')).toHaveTextContent('Message 2');
    expect(screen.getByText('second reply is ok')).toBeInTheDocument();
  });

  it('leaves the call-hook results ungrouped, since they carry no message index', () => {
    renderResults({
      uid: 'item-1',
      afterCallEndTestResults: [pass('r1', 'status is OK'), pass('r2', 'trailer is present')]
    });

    expect(screen.queryByTestId('grpc-test-message-group-0')).not.toBeInTheDocument();
    expect(screen.getByText('status is OK')).toBeInTheDocument();
  });

  it('renders nothing but a placeholder when no hook produced a result', () => {
    renderResults({ uid: 'item-1' });

    expect(screen.getByText('No tests found')).toBeInTheDocument();
  });
});
