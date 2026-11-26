import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent } from '@testing-library/react';
import { renderWithWorkspaceSpecs } from 'components/OpenAPISyncTab/testUtils';
import OverviewSection from './index';

const renderOverview = (syncConfig) => renderWithWorkspaceSpecs(
  <OverviewSection
    collection={{
      uid: 'pets-api',
      items: [],
      brunoConfig: { openapi: [{ sourceUrl: 'https://example.com/openapi.yaml', ...syncConfig }] }
    }}
    onTabSelect={jest.fn()}
    onOpenSettings={jest.fn()}
  />
);

const detailItem = (getByText, label) => getByText(label).closest('.spec-detail-item');

const detailValue = (getByText, label) => detailItem(getByText, label).querySelector('.spec-detail-value').textContent;

describe('OverviewSection', () => {
  it.each([
    ['summary', 'Summary'],
    ['operationId', 'OperationId'],
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
    const { getByText, getByTestId } = renderOverview({ requestNameSource: 'summary' });

    fireEvent.mouseEnter(getByTestId('openapi-sync-detail-request-naming-label-help'));

    expect(getByText('Determines how requests are named using fields from the OpenAPI spec with fallback options when unavailable.')).toBeInTheDocument();
  });

  it.each([
    ['collection', 'Authentication is set at the collection level and inherited by each request.'],
    ['request', 'Authentication is set separately on each request.']
  ])('explains the %s auth placement in a tooltip next to its value, not on the heading', (authPlacement, explanation) => {
    const { getByText, getByTestId, queryByTestId } = renderOverview({ authPlacement });

    expect(queryByTestId('openapi-sync-detail-auth-placement-label-help')).not.toBeInTheDocument();

    fireEvent.mouseEnter(getByTestId('openapi-sync-detail-auth-placement-help'));

    expect(getByText(explanation)).toBeInTheDocument();
  });

  it.each([
    ['are missing', {}],
    ['are empty', { requestNameSource: '', authPlacement: null }],
    ['are not values the sync knows', { requestNameSource: 'title', authPlacement: 'folder' }],
    ['use a different letter case', { requestNameSource: 'OperationId', authPlacement: 'Collection' }]
  ])('shows the defaults the sync applies when the naming and auth placement %s', (_description, syncConfig) => {
    const { getByText } = renderOverview(syncConfig);

    expect(detailValue(getByText, 'Request Naming')).toBe('Summary');
    expect(detailValue(getByText, 'Auth Placement')).toBe('Request');
  });

  it.each([
    ['are missing', {}],
    ['are not values the sync knows', { requestNameSource: 'title', authPlacement: 'folder' }]
  ])('explains the default naming and auth placement with the same tooltips as saved ones when they %s', (_description, syncConfig) => {
    const { getByText, getByTestId } = renderOverview(syncConfig);

    fireEvent.mouseEnter(getByTestId('openapi-sync-detail-request-naming-label-help'));
    expect(getByText('Determines how requests are named using fields from the OpenAPI spec with fallback options when unavailable.')).toBeInTheDocument();

    fireEvent.mouseEnter(getByTestId('openapi-sync-detail-auth-placement-help'));
    expect(getByText('Authentication is set separately on each request.')).toBeInTheDocument();
  });

  it('shows the auto-check interval next to the last synced time', () => {
    const { getByText, queryByText } = renderOverview({ autoCheck: true, autoCheckInterval: 15 });

    expect(detailItem(getByText, 'Last Synced At')).toHaveTextContent('Auto-check every 15 min');
    expect(queryByText('Auto Check for Updates')).not.toBeInTheDocument();
  });

  it('explains the auto-check interval in a tooltip on the badge', () => {
    const { getByText, getByTestId } = renderOverview({ autoCheck: true, autoCheckInterval: 15 });

    fireEvent.mouseEnter(getByTestId('openapi-sync-auto-check-help'));

    expect(getByText('Bruno checks the spec for changes every 15 minutes.', { exact: false })).toBeInTheDocument();
  });

  it('shows that auto-check is off next to the last synced time', () => {
    const { getByText } = renderOverview({ autoCheck: false });

    expect(detailItem(getByText, 'Last Synced At')).toHaveTextContent('Auto-check off');
  });
});
