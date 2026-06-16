import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import EnvironmentListContent from './index';
import themes from 'themes/index';
import userEvent from '@testing-library/user-event';
import { ThemeContext } from 'providers/Theme';

const renderWithTheme = (component) => {
  return render(
    <ThemeContext.Provider value={{ theme: themes.dark }}>
      <ThemeProvider theme={themes.dark}>
        {component}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};

describe('EnvironmentListContent', () => {
  const mockEnvironments = [
    { uid: 'env-1', name: 'Development', color: '#ff0000' },
    { uid: 'env-2', name: 'Staging', color: '#00ff00' },
    { uid: 'env-3', name: 'Production', color: '#0000ff' }
  ];

  const mockOnEnvironmentSelect = jest.fn();
  const mockOnSettingsClick = jest.fn();
  const mockOnCreateClick = jest.fn();
  const mockOnImportClick = jest.fn();

  const defaultProps = {
    environments: mockEnvironments,
    activeEnvironmentUid: 'env-1',
    description: 'Create an environment to get started',
    onEnvironmentSelect: mockOnEnvironmentSelect,
    onSettingsClick: mockOnSettingsClick,
    onCreateClick: mockOnCreateClick,
    onImportClick: mockOnImportClick
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render all environments and No Environment option', () => {
      renderWithTheme(<EnvironmentListContent {...defaultProps} />);

      expect(screen.getByTestId('env-no-environment-item')).toBeInTheDocument();

      const envItems = screen.getAllByTestId('env-list-item');
      expect(envItems).toHaveLength(3);
      expect(envItems[0]).toHaveTextContent('Development');
      expect(envItems[1]).toHaveTextContent('Staging');
      expect(envItems[2]).toHaveTextContent('Production');
    });

    it('should render empty state when there are no environments', () => {
      renderWithTheme(<EnvironmentListContent {...defaultProps} environments={[]} />);

      expect(screen.getByText('Ready to get started?')).toBeInTheDocument();
      expect(screen.getByText('Create an environment to get started')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Import/i })).toBeInTheDocument();
    });
  });

  describe('Search functionality', () => {
    it('should filter environments when typing in search input', async () => {
      renderWithTheme(<EnvironmentListContent {...defaultProps} />);
      const user = userEvent.setup();

      const searchInput = screen.getByTestId('env-search-input');
      await user.type(searchInput, 'stage');

      const envItems = screen.getAllByTestId('env-list-item');
      expect(envItems).toHaveLength(1);
      expect(envItems[0]).toHaveTextContent('Staging');

      // No Environment should always be visible
      expect(screen.getByTestId('env-no-environment-item')).toBeInTheDocument();
    });

    it('should show "No results found" when search matches nothing', async () => {
      renderWithTheme(<EnvironmentListContent {...defaultProps} />);
      const user = userEvent.setup();

      const searchInput = screen.getByTestId('env-search-input');
      await user.type(searchInput, 'xyz123');

      const envItems = screen.queryAllByTestId('env-list-item');
      expect(envItems).toHaveLength(0);

      expect(screen.getByTestId('env-no-results')).toBeInTheDocument();
      expect(screen.getByTestId('env-no-results')).toHaveTextContent('No results found');

      // No Environment should always be visible
      expect(screen.getByTestId('env-no-environment-item')).toBeInTheDocument();
    });

    it('should clear search when clicking the clear button', async () => {
      renderWithTheme(<EnvironmentListContent {...defaultProps} />);
      const user = userEvent.setup();

      const searchInput = screen.getByTestId('env-search-input');
      await user.type(searchInput, 'prod');

      expect(screen.getAllByTestId('env-list-item')).toHaveLength(1);

      const clearBtn = screen.getByTestId('env-search-clear-btn');
      await user.click(clearBtn);

      expect(searchInput).toHaveValue('');
      expect(screen.getAllByTestId('env-list-item')).toHaveLength(3);
    });

    it('should clear search when pressing Escape', async () => {
      renderWithTheme(<EnvironmentListContent {...defaultProps} />);
      const user = userEvent.setup();

      const searchInput = screen.getByTestId('env-search-input');
      await user.type(searchInput, 'dev');

      expect(screen.getAllByTestId('env-list-item')).toHaveLength(1);

      await user.keyboard('{Escape}');

      expect(searchInput).toHaveValue('');
      expect(screen.getAllByTestId('env-list-item')).toHaveLength(3);
    });
  });

  describe('Interactions', () => {
    it('should call onEnvironmentSelect with correct env when an item is clicked', async () => {
      renderWithTheme(<EnvironmentListContent {...defaultProps} />);
      const user = userEvent.setup();

      const envItems = screen.getAllByTestId('env-list-item');
      await user.click(envItems[1]); // Click Staging

      expect(mockOnEnvironmentSelect).toHaveBeenCalledWith(mockEnvironments[1]);
    });

    it('should call onEnvironmentSelect with null when No Environment is clicked', async () => {
      renderWithTheme(<EnvironmentListContent {...defaultProps} />);
      const user = userEvent.setup();

      const noEnvItem = screen.getByTestId('env-no-environment-item');
      await user.click(noEnvItem);

      expect(mockOnEnvironmentSelect).toHaveBeenCalledWith(null);
    });

    it('should call onSettingsClick when Configure is clicked', async () => {
      renderWithTheme(<EnvironmentListContent {...defaultProps} />);
      const user = userEvent.setup();

      const configureBtn = screen.getByTestId('configure-env');
      await user.click(configureBtn);

      expect(mockOnSettingsClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Focus Management', () => {
    it('should focus the input when pressing Backspace globally', () => {
      renderWithTheme(<EnvironmentListContent {...defaultProps} />);

      const searchInput = screen.getByTestId('env-search-input');
      expect(searchInput).not.toHaveFocus();

      fireEvent.keyDown(document, { key: 'Backspace' });
      expect(searchInput).toHaveFocus();
    });

    it('should focus the input when typing a printable character', () => {
      renderWithTheme(<EnvironmentListContent {...defaultProps} />);

      const searchInput = screen.getByTestId('env-search-input');
      expect(searchInput).not.toHaveFocus();

      fireEvent.keyDown(document, { key: 'a' });
      expect(searchInput).toHaveFocus();
    });
  });
});
