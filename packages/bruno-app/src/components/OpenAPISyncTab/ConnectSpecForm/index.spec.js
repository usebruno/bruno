import '@testing-library/jest-dom';
import React, { useState } from 'react';
import { fireEvent } from '@testing-library/react';
import { renderWithWorkspaceSpecs, workspaceSpec, pickWorkspaceSpec } from 'components/OpenAPISyncTab/testUtils';
import ConnectSpecForm from './index';

const petsSpec = workspaceSpec('pets', 'Pets', '/ws/specs/pets.yaml');
const swaggerSpec = workspaceSpec('legacy', 'Legacy', '/ws/specs/legacy.yaml', {
  swagger: '2.0',
  info: { title: 'Legacy' },
  paths: {}
});

const ConnectSpecFormHost = ({ onConnect }) => {
  const [sourceUrl, setSourceUrl] = useState('');
  const [error, setError] = useState(null);

  return (
    <ConnectSpecForm
      sourceUrl={sourceUrl}
      setSourceUrl={setSourceUrl}
      isLoading={false}
      error={error}
      setError={setError}
      onConnect={onConnect}
    />
  );
};

const renderForm = (specs = [petsSpec, swaggerSpec]) => {
  const onConnect = jest.fn();
  const utils = renderWithWorkspaceSpecs(<ConnectSpecFormHost onConnect={onConnect} />, specs);
  return { ...utils, onConnect };
};

describe('ConnectSpecForm', () => {
  it('shows the OpenAPI sync icon above the title', () => {
    const { getByTestId, getByRole } = renderForm();
    const icon = getByTestId('openapi-connect-icon');
    const title = getByRole('heading', { name: 'Connect to OpenAPI Spec' });

    expect(icon.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('opens on the Workspace tab with its hint', async () => {
    const { findByTestId, getByText } = renderForm();

    expect(await findByTestId('tab-workspace')).toHaveAttribute('aria-selected', 'true');
    expect(getByText('Select the spec from the active workspace')).toBeInTheDocument();
  });

  it('enables Connect once a workspace spec is picked and connects to it', () => {
    const { getByRole, getByTestId, onConnect } = renderForm();
    const connectButton = getByRole('button', { name: 'Connect' });
    expect(connectButton).toBeDisabled();

    pickWorkspaceSpec(getByTestId, 'pets');
    expect(connectButton).toBeEnabled();

    fireEvent.click(connectButton);
    expect(onConnect).toHaveBeenCalled();
  });

  it('disables Connect again when the picked spec leaves the workspace', () => {
    const { getByRole, getByTestId, setWorkspaceSpecs } = renderForm();
    pickWorkspaceSpec(getByTestId, 'pets');
    expect(getByRole('button', { name: 'Connect' })).toBeEnabled();

    setWorkspaceSpecs([swaggerSpec]);

    expect(getByTestId('spec-source-workspace-select')).toHaveTextContent('Select an API spec');
    expect(getByRole('button', { name: 'Connect' })).toBeDisabled();
  });

  it('shows the validation error for a workspace spec that is not OpenAPI 3.x', () => {
    const { getByRole, getByTestId, getByText } = renderForm();

    pickWorkspaceSpec(getByTestId, 'legacy');

    expect(getByText('Swagger 2.0 is not supported. Please convert your spec to OpenAPI 3.x.')).toBeInTheDocument();
    expect(getByRole('button', { name: 'Connect' })).toBeDisabled();
  });

  it('keeps the picked spec when the active tab is clicked again', () => {
    const { getByRole, getByTestId } = renderForm();
    pickWorkspaceSpec(getByTestId, 'pets');

    fireEvent.click(getByTestId('tab-workspace'));

    expect(getByTestId('spec-source-workspace-select')).toHaveTextContent('Pets');
    expect(getByRole('button', { name: 'Connect' })).toBeEnabled();
  });

  it('announces a validation error to screen readers', () => {
    const { getByRole, getByTestId } = renderForm();

    pickWorkspaceSpec(getByTestId, 'legacy');

    expect(getByRole('alert')).toHaveTextContent('Swagger 2.0 is not supported. Please convert your spec to OpenAPI 3.x.');
  });

  it('clears the picked source and its error when switching tabs', async () => {
    const { findByTestId, getByTestId, queryByText } = renderForm();
    pickWorkspaceSpec(getByTestId, 'legacy');

    fireEvent.click(await findByTestId('tab-url'));
    fireEvent.click(await findByTestId('tab-workspace'));

    expect(queryByText('Swagger 2.0 is not supported. Please convert your spec to OpenAPI 3.x.')).not.toBeInTheDocument();
    expect(getByTestId('spec-source-workspace-select')).toHaveTextContent('Select an API spec');
  });

  it('enables Connect on the URL tab only for an http URL', async () => {
    const { findByTestId, getByRole, getByTestId, getByText } = renderForm();
    fireEvent.click(await findByTestId('tab-url'));
    const urlInput = getByTestId('spec-source-url-input');

    expect(getByText('Supports OpenAPI 3.x specifications in JSON or YAML format')).toBeInTheDocument();

    fireEvent.change(urlInput, { target: { value: 'not a url' } });
    expect(getByRole('button', { name: 'Connect' })).toBeDisabled();

    fireEvent.change(urlInput, { target: { value: 'https://api.example.com/openapi.json' } });
    expect(getByRole('button', { name: 'Connect' })).toBeEnabled();
  });

  it('shows the file hint on the File tab', async () => {
    const { findByTestId, getByText } = renderForm();

    fireEvent.click(await findByTestId('tab-file'));

    expect(getByText('Select a local OpenAPI/Swagger JSON or YAML file')).toBeInTheDocument();
  });
});
