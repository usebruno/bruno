import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'providers/Theme';
import GradientCloseButton from './index';

const renderButton = (props) => render(
  <ThemeProvider>
    <GradientCloseButton onClick={() => {}} {...props} />
  </ThemeProvider>
);

describe('GradientCloseButton', () => {
  it('shows an indicator without marking the tab as having changes', () => {
    renderButton({ indicator: <span data-testid="indicator" /> });
    expect(document.querySelector('.close-gradient')).toHaveClass('has-indicator');
    expect(document.querySelector('.close-gradient')).not.toHaveClass('has-changes');
  });

  it('shows the indicator in place of the draft icon', () => {
    renderButton({ hasChanges: true, indicator: <span data-testid="indicator" /> });
    expect(screen.getByTestId('indicator')).toBeInTheDocument();
    expect(document.querySelector('.has-changes-icon')).not.toBeInTheDocument();
  });
});
