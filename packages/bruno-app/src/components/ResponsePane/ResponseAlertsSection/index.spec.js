import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'providers/Theme';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ResponseAlertsSection from './index';

jest.mock('../ResponseErrorsCard', () => ({ isCardFullPane }) => (
  <div data-testid="response-errors-card" data-full-pane={String(isCardFullPane)} />
));

const item = { uid: 'req-1', requestUid: 'run-1', unresolvedVariables: ['host'] };

const responsePaneErrors = (overrides = {}) => ({
  errors: [{ scriptType: 'test' }],
  isCardRemoved: false,
  closeCard: jest.fn(),
  isCardFullPane: false,
  toggleCardFullPane: jest.fn(),
  ...overrides
});

const renderSection = (paneErrors, sectionItem = item) => render(
  <Provider store={configureStore({ reducer: (state = {}) => state })}>
    <ThemeProvider>
      <ResponseAlertsSection item={sectionItem} collection={{ uid: 'col-1' }} responsePaneErrors={paneErrors} />
    </ThemeProvider>
  </Provider>
);

const renderedTestIds = (container) => Array.from(container.firstChild.children).map((child) => child.dataset.testid);

describe('ResponseAlertsSection', () => {
  it('renders the error card above the unresolved-variables info', () => {
    const { container } = renderSection(responsePaneErrors());
    expect(renderedTestIds(container)).toEqual(['response-errors-card', 'unresolved-variables-info']);
  });

  it('hides the info card while the errors card fills the pane', () => {
    const { container } = renderSection(responsePaneErrors({ isCardFullPane: true }));
    expect(renderedTestIds(container)).toEqual(['response-errors-card']);
    expect(screen.getByTestId('response-errors-card')).toHaveAttribute('data-full-pane', 'true');
  });

  it('renders nothing when there are no errors and no unresolved variables', () => {
    const { container } = renderSection(responsePaneErrors({ errors: [] }), { ...item, unresolvedVariables: null });
    expect(container).toBeEmptyDOMElement();
  });

  it('leaves out the error card when there are no errors', () => {
    const { container } = renderSection(responsePaneErrors({ errors: [] }));
    expect(renderedTestIds(container)).toEqual(['unresolved-variables-info']);
  });

  it('leaves out the error card while it is closed', () => {
    const { container } = renderSection(responsePaneErrors({ isCardRemoved: true }));
    expect(renderedTestIds(container)).toEqual(['unresolved-variables-info']);
  });
});
