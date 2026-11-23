import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent } from '@testing-library/react';
import { renderWithWorkspaceSpecs } from 'components/OpenAPISyncTab/testUtils';
import OverviewSection from './index';

const renderOverview = (syncConfig, drift = {}) => renderWithWorkspaceSpecs(
  <OverviewSection
    collection={{
      uid: 'pets-api',
      items: [],
      brunoConfig: { openapi: [{ sourceUrl: 'https://example.com/openapi.yaml', ...syncConfig }] }
    }}
    {...drift}
    onTabSelect={jest.fn()}
    onOpenSettings={jest.fn()}
  />
);

const renamedEndpointDrift = (conflictingFields) => {
  const pets = { id: 'GET:/pets', method: 'GET', path: '/pets' };
  return {
    collectionDrift: { edited: [], modified: [], missing: [], localOnly: [] },
    specDrift: { added: [], modified: [pets], removed: [] },
    remoteDrift: { modified: [{ ...pets, conflictingFields }], missing: [], localOnly: [], inSync: [] }
  };
};

const detailItem = (getByText, label) => getByText(label).closest('.spec-detail-item');

const detailValue = (getByText, label) => detailItem(getByText, label).querySelector('.spec-detail-value').textContent;

describe('OverviewSection', () => {
  it.each([
    ['summary', 'Summary'],
    ['operationId', 'operationId'],
    ['description', 'Description'],
    ['path', 'Path']
  ])('shows the %s naming as %s', (requestNameSource, label) => {
    const { getByText } = renderOverview({ requestNameSource });

    expect(detailValue(getByText, 'Request Naming')).toBe(label);
  });

  it.each([
    ['request', 'Request'],
    ['collection', 'Collection']
  ])('shows the %s auth placement as %s', (authPlacement, label) => {
    const { getByText } = renderOverview({ authPlacement });

    expect(detailValue(getByText, 'Auth Placement')).toBe(label);
  });

  it('explains Request Naming in a tooltip on its heading', () => {
    const { getByText } = renderOverview({ requestNameSource: 'summary' });

    fireEvent.mouseEnter(getByText('Request Naming').querySelector('svg').parentElement);

    expect(getByText('Determines how requests are named using fields from the OpenAPI spec with fallback options when unavailable.')).toBeInTheDocument();
  });

  it.each([
    ['collection', 'Authentication is set at the collection level and inherited by each request.'],
    ['request', 'Authentication is set separately on each request.']
  ])('explains the %s auth placement in a tooltip next to its value, not on the heading', (authPlacement, explanation) => {
    const { getByText } = renderOverview({ authPlacement });
    const value = detailItem(getByText, 'Auth Placement').querySelector('.spec-detail-value');

    expect(getByText('Auth Placement').querySelector('svg')).toBeNull();

    fireEvent.mouseEnter(value.querySelector('svg').parentElement);

    expect(getByText(explanation)).toBeInTheDocument();
  });

  it('hides naming and auth placement when the sync settings have neither', () => {
    const { queryByText } = renderOverview({});

    expect(queryByText('Request Naming')).not.toBeInTheDocument();
    expect(queryByText('Auth Placement')).not.toBeInTheDocument();
  });

  it('shows the auto-check interval next to the last synced time', () => {
    const { getByText, queryByText } = renderOverview({ autoCheck: true, autoCheckInterval: 15 });

    expect(detailItem(getByText, 'Last Synced At')).toHaveTextContent('Auto-check every 15 min');
    expect(queryByText('Auto Check for Updates')).not.toBeInTheDocument();
  });

  it('explains the auto-check interval in a tooltip on the badge', () => {
    const { getByText } = renderOverview({ autoCheck: true, autoCheckInterval: 15 });

    fireEvent.mouseEnter(getByText('Auto-check every 15 min').querySelector('svg').parentElement);

    expect(getByText('Bruno checks the spec for changes every 15 minutes.', { exact: false })).toBeInTheDocument();
  });

  it('shows that auto-check is off next to the last synced time', () => {
    const { getByText } = renderOverview({ autoCheck: false });

    expect(detailItem(getByText, 'Last Synced At')).toHaveTextContent('Auto-check off');
  });

  it('counts a rename made in both the spec and the collection as a conflict', () => {
    const { getByText } = renderOverview({}, renamedEndpointDrift(['name']));

    expect(getByText('(1 conflict)')).toBeInTheDocument();
  });

  it('does not count a rename made only in the spec as a conflict', () => {
    const { queryByText } = renderOverview({}, renamedEndpointDrift([]));

    expect(queryByText(/conflict/)).not.toBeInTheDocument();
  });

  it('shows a value it does not recognise as written', () => {
    const { getByText } = renderOverview({ requestNameSource: 'title', authPlacement: 'folder' });

    expect(detailValue(getByText, 'Request Naming')).toBe('title');
    expect(detailValue(getByText, 'Auth Placement')).toBe('Folder');
    expect(detailItem(getByText, 'Auth Placement').querySelector('svg')).toBeNull();
  });
});
