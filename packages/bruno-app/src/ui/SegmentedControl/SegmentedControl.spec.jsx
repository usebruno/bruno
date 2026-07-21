import '@testing-library/jest-dom';
import React, { useState, createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import SegmentedControl from './index';
import Segment from './components/Segment'; // internal building block, tested directly

// Minimal theme with only the tokens SegmentedControl's StyledWrapper reads.
// `brand` must be a valid color — polished's transparentize() throws otherwise.
const theme = {
  mode: 'light',
  text: '#343434',
  brand: 'hsl(33, 80%, 46%)',
  bg: '#ffffff',
  background: { base: '#ffffff', crust: '#f6f6f6', surface0: '#f1f1f1', surface2: '#e5e5e5' },
  input: { border: '#cccccc', bg: '#ffffff' },
  colors: { text: { muted: '#9b9b9b' } },
  dropdown: { hoverBg: '#f1f1f1' },
  shadow: { sm: '0 1px 3px rgba(0, 0, 0, 0.12)' },
  border: { radius: { sm: '4px', md: '6px' } },
  font: { size: { sm: '0.75rem', base: '0.8125rem', md: '0.875rem' } }
};

const renderWithTheme = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

const requestTypes = [
  { value: 'http', label: 'HTTP' },
  { value: 'graphql', label: 'GraphQL' },
  { value: 'grpc', label: 'gRPC' },
  { value: 'ws', label: 'WebSocket' }
];

// Render the public (list) SegmentedControl with sensible defaults.
const renderSegmentedControl = (props = {}) =>
  renderWithTheme(
    <SegmentedControl
      name="requestType"
      ariaLabel="Request type"
      value="http"
      onChange={() => {}}
      items={requestTypes}
      {...props}
    />
  );

describe('SegmentedControl', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('renders all items inside a radiogroup', () => {
    renderSegmentedControl();

    expect(screen.getByRole('radiogroup', { name: 'Request type' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
  });

  it('reflects the selected value as checked', () => {
    renderSegmentedControl({ value: 'graphql' });

    expect(screen.getByRole('radio', { name: 'GraphQL' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'HTTP' })).not.toBeChecked();
  });

  it('calls onChange with the value (and event) when a segment is selected', async () => {
    const onChange = jest.fn();
    renderSegmentedControl({ onChange });

    await user.click(screen.getByRole('radio', { name: 'gRPC' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toBe('grpc');
    expect(onChange.mock.calls[0][1]).toHaveProperty('target');
  });

  it('updates selection when driven as a controlled component', async () => {
    const Controlled = () => {
      const [value, setValue] = useState('http');
      return (
        <SegmentedControl name="requestType" ariaLabel="Request type" value={value} onChange={setValue} items={requestTypes} />
      );
    };
    renderWithTheme(<Controlled />);

    await user.click(screen.getByRole('radio', { name: 'WebSocket' }));

    expect(screen.getByRole('radio', { name: 'WebSocket' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'HTTP' })).not.toBeChecked();
  });

  it('does not fire onChange when the whole group is disabled', async () => {
    const onChange = jest.fn();
    renderSegmentedControl({ onChange, disabled: true });

    const graphql = screen.getByRole('radio', { name: 'GraphQL' });
    expect(graphql).toBeDisabled();
    await user.click(graphql);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disables only the item marked disabled', async () => {
    const onChange = jest.fn();
    renderSegmentedControl({
      onChange,
      items: [
        { value: 'http', label: 'HTTP' },
        { value: 'grpc', label: 'gRPC', disabled: true }
      ]
    });

    expect(screen.getByRole('radio', { name: 'gRPC' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'HTTP' })).toBeEnabled();
    await user.click(screen.getByRole('radio', { name: 'gRPC' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shares a single generated name across inputs when none is provided', () => {
    renderSegmentedControl({ name: undefined });

    const radios = screen.getAllByRole('radio');
    const [first] = radios;
    expect(first.name).toBeTruthy();
    radios.forEach((r) => expect(r.name).toBe(first.name));
  });

  it('applies item dataTestId to the underlying input', () => {
    renderSegmentedControl({ items: [{ value: 'http', label: 'HTTP', dataTestId: 'seg-http' }] });

    expect(screen.getByTestId('seg-http')).toBe(screen.getByRole('radio', { name: 'HTTP' }));
  });

  it('applies dataTestId to the group container', () => {
    renderSegmentedControl({ dataTestId: 'req-type-group' });

    expect(screen.getByTestId('req-type-group')).toBe(screen.getByRole('radiogroup'));
  });

  it('forwards additional props to the radiogroup container', () => {
    renderSegmentedControl({ 'data-custom': 'xyz' });

    expect(screen.getByRole('radiogroup')).toHaveAttribute('data-custom', 'xyz');
  });

  it('forwards extra item props to the underlying input', () => {
    renderSegmentedControl({ items: [{ value: 'http', label: 'HTTP', id: 'seg-http-input', required: true }] });

    const input = screen.getByRole('radio', { name: 'HTTP' });
    expect(input).toHaveAttribute('id', 'seg-http-input');
    expect(input).toBeRequired();
  });

  it('forwards the ref to the radiogroup element', () => {
    const ref = createRef();
    renderSegmentedControl({ ref });

    expect(ref.current).toBe(screen.getByRole('radiogroup'));
  });

  describe('accessible name', () => {
    it('is derived from ariaLabel', () => {
      renderSegmentedControl({ ariaLabel: 'Protocol' });
      expect(screen.getByRole('radiogroup', { name: 'Protocol' })).toBeInTheDocument();
    });

    it('is derived from an external element via ariaLabelledBy', () => {
      renderWithTheme(
        <>
          <span id="ext-label">Protocol</span>
          <SegmentedControl name="requestType" ariaLabelledBy="ext-label" value="http" onChange={() => {}} items={requestTypes} />
        </>
      );
      expect(screen.getByRole('radiogroup', { name: 'Protocol' })).toBeInTheDocument();
    });
  });

  it('throws if the internal Segment is used outside a SegmentedControl', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderWithTheme(<Segment value="x" label="X" />)).toThrow(
      '<Segment> must be rendered inside <SegmentedControl>.'
    );
    spy.mockRestore();
  });
});
