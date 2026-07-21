import '@testing-library/jest-dom';
import React, { useState, createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import SegmentGroup, { Segment } from './index';

// Minimal theme with only the tokens SegmentGroup's StyledWrapper reads.
// `brand` must be a valid color — polished's transparentize() throws otherwise.
const theme = {
  text: '#343434',
  brand: 'hsl(33, 80%, 46%)',
  input: { border: '#cccccc', bg: '#ffffff' },
  colors: { text: { muted: '#9b9b9b' } },
  dropdown: { hoverBg: '#f1f1f1' },
  border: { radius: { md: '6px' } },
  font: { size: { sm: '0.75rem', base: '0.8125rem', md: '0.875rem' } }
};

const renderWithTheme = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

const RequestTypes = () => (
  <>
    <Segment value="http" label="HTTP" />
    <Segment value="graphql" label="GraphQL" />
    <Segment value="grpc" label="gRPC" />
    <Segment value="ws" label="WebSocket" />
  </>
);

// Render a SegmentGroup with sensible defaults; override via `props`, and pass
// custom `children` when a test needs specific segments.
const renderSegmentGroup = (props = {}, children = <RequestTypes />) =>
  renderWithTheme(
    <SegmentGroup name="requestType" ariaLabel="Request type" value="http" onChange={() => {}} {...props}>
      {children}
    </SegmentGroup>
  );

describe('SegmentGroup', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('renders all segments inside a radiogroup', () => {
    renderSegmentGroup();

    expect(screen.getByRole('radiogroup', { name: 'Request type' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
  });

  it('reflects the selected value as checked', () => {
    renderSegmentGroup({ value: 'graphql' });

    expect(screen.getByRole('radio', { name: 'GraphQL' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'HTTP' })).not.toBeChecked();
  });

  it('calls onChange with the value (and event) when a segment is selected', async () => {
    const onChange = jest.fn();
    renderSegmentGroup({ onChange });

    await user.click(screen.getByRole('radio', { name: 'gRPC' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toBe('grpc');
    expect(onChange.mock.calls[0][1]).toHaveProperty('target');
  });

  it('updates selection when driven as a controlled component', async () => {
    const Controlled = () => {
      const [value, setValue] = useState('http');
      return (
        <SegmentGroup name="requestType" ariaLabel="Request type" value={value} onChange={setValue}>
          <RequestTypes />
        </SegmentGroup>
      );
    };
    renderWithTheme(<Controlled />);

    await user.click(screen.getByRole('radio', { name: 'WebSocket' }));

    expect(screen.getByRole('radio', { name: 'WebSocket' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'HTTP' })).not.toBeChecked();
  });

  it('does not fire onChange when the whole group is disabled', async () => {
    const onChange = jest.fn();
    renderSegmentGroup({ onChange, disabled: true });

    const graphql = screen.getByRole('radio', { name: 'GraphQL' });
    expect(graphql).toBeDisabled();
    await user.click(graphql);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disables only the segment marked disabled', async () => {
    const onChange = jest.fn();
    renderSegmentGroup(
      { onChange },
      <>
        <Segment value="http" label="HTTP" />
        <Segment value="grpc" label="gRPC" disabled />
      </>
    );

    expect(screen.getByRole('radio', { name: 'gRPC' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'HTTP' })).toBeEnabled();
    await user.click(screen.getByRole('radio', { name: 'gRPC' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shares a single generated name across inputs when none is provided', () => {
    renderSegmentGroup({ name: undefined });

    const radios = screen.getAllByRole('radio');
    const [first] = radios;
    expect(first.name).toBeTruthy();
    radios.forEach((r) => expect(r.name).toBe(first.name));
  });

  it('applies dataTestId to the underlying input', () => {
    renderSegmentGroup({}, <Segment value="http" label="HTTP" dataTestId="seg-http" />);

    expect(screen.getByTestId('seg-http')).toBe(screen.getByRole('radio', { name: 'HTTP' }));
  });

  it('applies dataTestId to the group container', () => {
    renderSegmentGroup({ dataTestId: 'req-type-group' });

    expect(screen.getByTestId('req-type-group')).toBe(screen.getByRole('radiogroup'));
  });

  it('forwards additional props to the radiogroup container', () => {
    renderSegmentGroup({ 'data-custom': 'xyz' });

    expect(screen.getByRole('radiogroup')).toHaveAttribute('data-custom', 'xyz');
  });

  it('forwards arbitrary props to the underlying input', () => {
    renderSegmentGroup(
      {},
      <Segment value="http" label="HTTP" id="seg-http-input" required />
    );

    const input = screen.getByRole('radio', { name: 'HTTP' });
    expect(input).toHaveAttribute('id', 'seg-http-input');
    expect(input).toBeRequired();
  });

  it('forwards the group ref to the radiogroup element', () => {
    const ref = createRef();
    renderSegmentGroup({ ref });

    expect(ref.current).toBe(screen.getByRole('radiogroup'));
  });

  it('forwards the segment ref to its input', () => {
    const ref = createRef();
    renderSegmentGroup({}, <Segment ref={ref} value="http" label="HTTP" />);

    expect(ref.current).toBe(screen.getByRole('radio', { name: 'HTTP' }));
  });

  describe('accessible name', () => {
    it('is derived from ariaLabel', () => {
      renderSegmentGroup({ ariaLabel: 'Protocol' });
      expect(screen.getByRole('radiogroup', { name: 'Protocol' })).toBeInTheDocument();
    });

    it('is derived from an external element via ariaLabelledBy', () => {
      renderWithTheme(
        <>
          <span id="ext-label">Protocol</span>
          <SegmentGroup name="requestType" ariaLabelledBy="ext-label" value="http" onChange={() => {}}>
            <RequestTypes />
          </SegmentGroup>
        </>
      );
      expect(screen.getByRole('radiogroup', { name: 'Protocol' })).toBeInTheDocument();
    });
  });

  it('throws if Segment is used outside a SegmentGroup', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderWithTheme(<Segment value="x" label="X" />)).toThrow(
      '<Segment> must be rendered inside <SegmentGroup>.'
    );
    spy.mockRestore();
  });
});
