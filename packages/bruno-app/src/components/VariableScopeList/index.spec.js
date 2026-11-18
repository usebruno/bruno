import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import VariableScopeList from './index';

const scopes = [
  { type: 'request', label: 'Request Variable', enabled: true },
  { type: 'collection', label: 'Collection Variable', enabled: true },
  { type: 'environment', label: 'Collection Environment', enabled: false }
];

const renderList = (props = {}) => {
  const onSelect = jest.fn();
  const onCreateEnvironment = jest.fn(() => Promise.resolve());
  render(
    <ThemeProvider theme={themes.light}>
      <VariableScopeList
        scopes={scopes}
        selectedScopeType="request"
        onSelect={onSelect}
        onCreateEnvironment={onCreateEnvironment}
        testIdPrefix="test"
        {...props}
      />
    </ThemeProvider>
  );
  return { onSelect, onCreateEnvironment };
};

const openCreator = () => {
  fireEvent.click(screen.getByTestId('test-create-env-link-environment'));
  return screen.getByTestId('test-create-env-input-environment');
};

describe('VariableScopeList', () => {
  it('marks the selected scope and reports clicks on the others', () => {
    const { onSelect } = renderList();

    expect(screen.getByTestId('test-scope-request')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('test-scope-collection')).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByTestId('test-scope-collection'));
    expect(onSelect).toHaveBeenCalledWith('collection');
  });

  it('offers inline creation for a disabled scope', () => {
    renderList();

    expect(screen.queryByTestId('test-scope-environment')).not.toBeInTheDocument();
    expect(screen.getByTestId('test-no-env-environment')).toHaveTextContent('No Collection Environment selected');
  });

  it('requires a name before creating', () => {
    const { onCreateEnvironment } = renderList();

    openCreator();
    fireEvent.click(screen.getByTestId('test-create-env-submit-environment'));

    expect(screen.getByTestId('test-create-env-error-environment')).toHaveTextContent('Environment name is required');
    expect(onCreateEnvironment).not.toHaveBeenCalled();
  });

  it('passes the scope and name to onCreateEnvironment on Enter', async () => {
    const { onCreateEnvironment } = renderList();

    const input = openCreator();
    fireEvent.change(input, { target: { value: 'Staging' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onCreateEnvironment).toHaveBeenCalledWith(scopes[2], 'Staging');
    await waitFor(() => expect(screen.getByTestId('test-create-env-link-environment')).toBeInTheDocument());
  });

  it('keeps the name and shows the error when creation fails', async () => {
    renderList({ onCreateEnvironment: jest.fn(() => Promise.reject(new Error('Environment already exists'))) });

    const input = openCreator();
    fireEvent.change(input, { target: { value: 'Dev' } });
    fireEvent.click(screen.getByTestId('test-create-env-submit-environment'));

    expect(await screen.findByTestId('test-create-env-error-environment')).toHaveTextContent('Environment already exists');
    expect(screen.getByTestId('test-create-env-input-environment')).toHaveValue('Dev');
  });

  it('opens only one create form at a time', () => {
    renderList({ scopes: [...scopes, { type: 'global', label: 'Global Environment', enabled: false }] });

    openCreator();
    fireEvent.click(screen.getByTestId('test-create-env-link-global'));

    expect(screen.getByTestId('test-create-env-input-global')).toBeInTheDocument();
    expect(screen.queryByTestId('test-create-env-input-environment')).not.toBeInTheDocument();
    expect(screen.getByTestId('test-create-env-link-environment')).toBeInTheDocument();
  });

  it('starts with an empty name and no error when the form is reopened', () => {
    renderList();

    const input = openCreator();
    fireEvent.change(input, { target: { value: 'stag' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(openCreator()).toHaveValue('');
  });

  it('closes the form on Escape without letting the key reach the popover', () => {
    const onPopoverKeyDown = jest.fn();
    render(
      <ThemeProvider theme={themes.light}>
        <div onKeyDown={onPopoverKeyDown}>
          <VariableScopeList
            scopes={scopes}
            selectedScopeType="request"
            onSelect={jest.fn()}
            onCreateEnvironment={jest.fn(() => Promise.resolve())}
            testIdPrefix="test"
          />
        </div>
      </ThemeProvider>
    );

    fireEvent.keyDown(openCreator(), { key: 'Escape' });

    expect(screen.getByTestId('test-create-env-link-environment')).toBeInTheDocument();
    expect(onPopoverKeyDown).not.toHaveBeenCalled();
  });

  it('clears the error once the name changes', () => {
    renderList();

    const input = openCreator();
    fireEvent.click(screen.getByTestId('test-create-env-submit-environment'));
    expect(screen.getByTestId('test-create-env-error-environment')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'S' } });
    expect(screen.queryByTestId('test-create-env-error-environment')).not.toBeInTheDocument();
  });

  describe('while an environment is being created', () => {
    const scopesWithGlobal = [...scopes, { type: 'global', label: 'Global Environment', enabled: false }];

    const startPendingCreation = () => {
      let settle;
      const pending = new Promise((resolve, reject) => {
        settle = { resolve, reject };
      });
      renderList({ scopes: scopesWithGlobal, onCreateEnvironment: jest.fn(() => pending) });

      const input = openCreator();
      fireEvent.change(input, { target: { value: 'Staging' } });
      fireEvent.click(screen.getByTestId('test-create-env-submit-environment'));
      return settle;
    };

    const expectListLocked = (locked) => {
      const assertion = locked ? 'toBeDisabled' : 'toBeEnabled';
      expect(screen.getByTestId('test-scope-request'))[assertion]();
      expect(screen.getByTestId('test-scope-collection'))[assertion]();
      expect(screen.getByTestId('test-create-env-link-global'))[assertion]();
    };

    it('disables the other rows until the creation succeeds', async () => {
      const settle = startPendingCreation();

      expect(screen.getByTestId('test-create-env-submit-environment')).toHaveTextContent('Creating…');
      expectListLocked(true);

      settle.resolve();
      await waitFor(() => expectListLocked(false));
    });

    it('enables the other rows again when the creation fails', async () => {
      const settle = startPendingCreation();
      expectListLocked(true);

      settle.reject(new Error('Environment already exists'));

      expect(await screen.findByTestId('test-create-env-error-environment')).toHaveTextContent('Environment already exists');
      expectListLocked(false);
    });
  });
});
