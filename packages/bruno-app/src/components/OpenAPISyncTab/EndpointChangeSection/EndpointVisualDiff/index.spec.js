import '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import EndpointVisualDiff from './index';

const endpointData = ({ name = 'List pets', docs = '', headers = [] } = {}) => ({
  name,
  request: {
    method: 'GET',
    url: '{{baseUrl}}/pets',
    params: [],
    headers,
    body: { mode: 'none' },
    auth: { mode: 'none' },
    docs
  }
});

const renderDiff = (oldData, newData) => render(
  <ThemeProvider theme={themes.light}>
    <EndpointVisualDiff oldData={oldData} newData={newData} />
  </ThemeProvider>
);

const sectionTitles = (container) => [...container.querySelectorAll('.diff-row-title')].map((title) => title.textContent);

const pane = (container, title, side) => [...container.querySelectorAll('.diff-row')]
  .find((row) => row.querySelector('.diff-row-title').textContent === title)
  .querySelector(`.diff-row-pane.${side}`);

describe('EndpointVisualDiff', () => {
  it('shows the current and the incoming name', () => {
    const { container } = renderDiff(endpointData({ name: 'List pets' }), endpointData({ name: 'Find pets' }));

    expect(sectionTitles(container)).toEqual(['Name']);
    expect(pane(container, 'Name', 'old')).toHaveTextContent('List pets');
    expect(pane(container, 'Name', 'old').querySelector('.diff-inline.deleted')).toHaveTextContent('List');
    expect(pane(container, 'Name', 'new')).toHaveTextContent('Find pets');
    expect(pane(container, 'Name', 'new').querySelector('.diff-inline.added')).toHaveTextContent('Find');
  });

  it('shows the current and the incoming docs line by line', () => {
    const { container } = renderDiff(
      endpointData({ docs: 'Lists pets.\nPaged.' }),
      endpointData({ docs: 'Lists pets.\nSorted by name.' })
    );

    expect(sectionTitles(container)).toEqual(['Docs']);
    expect(pane(container, 'Docs', 'old').querySelector('.diff-line.deleted')).toHaveTextContent('Paged.');
    expect(pane(container, 'Docs', 'new').querySelector('.diff-line.added')).toHaveTextContent('Sorted by name.');
  });

  it('shows docs the spec adds next to an empty current side', () => {
    const { container } = renderDiff(endpointData(), endpointData({ docs: 'Lists pets.' }));

    expect(pane(container, 'Docs', 'old').querySelector('.empty-placeholder')).toBeInTheDocument();
    expect(pane(container, 'Docs', 'new').querySelector('.diff-line.added')).toHaveTextContent('Lists pets.');
  });

  it('shows docs the spec removes next to an empty incoming side', () => {
    const { container } = renderDiff(endpointData({ docs: 'Lists pets.' }), endpointData());

    expect(pane(container, 'Docs', 'old').querySelector('.diff-line.deleted')).toHaveTextContent('Lists pets.');
    expect(pane(container, 'Docs', 'new').querySelector('.empty-placeholder')).toBeInTheDocument();
  });

  it('leaves out the name and docs when only other fields differ', () => {
    const { container } = renderDiff(
      endpointData({ docs: 'Lists pets.' }),
      endpointData({ docs: 'Lists pets.', headers: [{ name: 'X-Trace', value: '', enabled: true }] })
    );

    expect(sectionTitles(container)).toEqual(['Headers']);
  });
});
