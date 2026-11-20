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
  it.each(['Enter', ' '])('toggles when "%s" is pressed on the header', (key) => {
    const { onToggle } = renderSection();
    fireEvent.keyDown(screen.getByTestId('section-header'), { key });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it.each(['Enter', ' '])('does not toggle when "%s" is pressed on the title', (key) => {
    const { onToggle } = renderSection();
    fireEvent.keyDown(screen.getByTestId('section-title'), { key });
    expect(onToggle).not.toHaveBeenCalled();
  });
});
