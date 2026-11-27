import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { IconBox } from '@tabler/icons';
import themes from 'themes/index';
import ScopeSection from './index';

const renderSection = () => {
  const onToggle = jest.fn();
  const onTitleClick = jest.fn();
  render(
    <ThemeProvider theme={themes.light}>
      <ScopeSection
        icon={IconBox}
        title="Collection Variable"
        count={1}
        expanded
        onToggle={onToggle}
        onTitleClick={onTitleClick}
        testId="section"
      >
        <div />
      </ScopeSection>
    </ThemeProvider>
  );
  return { onToggle, onTitleClick };
};

describe('ScopeSection', () => {
  it('toggles from the chevron button, which reports the expanded state', () => {
    const { onToggle } = renderSection();
    const toggle = screen.getByTestId('section-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName('Collapse Collection Variable');
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('opens the scope from the title without toggling', () => {
    const { onToggle, onTitleClick } = renderSection();
    fireEvent.click(screen.getByTestId('section-title'));
    expect(onTitleClick).toHaveBeenCalledTimes(1);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('keeps the title and the toggle as separate buttons', () => {
    renderSection();
    expect(screen.getByTestId('section-header')).not.toHaveAttribute('role');
    expect(screen.getByTestId('section-title').closest('button, [role="button"]')).toBe(screen.getByTestId('section-title'));
  });
});
