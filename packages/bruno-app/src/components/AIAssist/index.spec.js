import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import { aiGenerateScript } from 'utils/ai';
import AIAssist from './index';

jest.mock('utils/ai', () => ({
  aiGenerateScript: jest.fn()
}));

const theme = {
  bg: '#1e1e1e',
  text: '#ffffff',
  border: { radius: { sm: '4px', md: '6px' } },
  colors: {
    accent: '#6366f1',
    text: { muted: '#9ca3af', danger: '#ef4444' },
    bg: { danger: '#ef4444' }
  },
  input: {
    border: '#374151',
    bg: '#111827',
    focusBorder: '#6366f1'
  },
  font: { monospace: 'monospace' }
};

const createStore = (aiEnabled = true) => configureStore({
  reducer: {
    app: (state = { preferences: { ai: { enabled: aiEnabled } } }) => state
  }
});

const defaultProps = {
  scriptType: 'tests',
  currentScript: 'test("ok", () => {});',
  onApply: jest.fn()
};

const renderAIAssist = ({
  props = {},
  aiEnabled = true
} = {}) => {
  const mergedProps = { ...defaultProps, ...props };
  return render(
    <Provider store={createStore(aiEnabled)}>
      <ThemeProvider theme={theme}>
        <AIAssist {...mergedProps} />
      </ThemeProvider>
    </Provider>
  );
};

const openPopup = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Generate Tests' }));
};

describe('AIAssist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    aiGenerateScript.mockResolvedValue({ content: 'test("generated", () => {});' });
  });

  describe('visibility', () => {
    it('renders nothing when AI is disabled', () => {
      const { container } = renderAIAssist({ aiEnabled: false });
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing for an unsupported script type', () => {
      const { container } = renderAIAssist({ props: { scriptType: 'unknown-type' } });
      expect(container.firstChild).toBeNull();
    });

    it('renders the trigger when AI is enabled and the script type is supported', () => {
      renderAIAssist();
      expect(screen.getByRole('button', { name: 'Generate Tests' })).toBeInTheDocument();
    });
  });

  describe('titles', () => {
    it.each([
      ['tests', 'Generate Tests'],
      ['pre-request', 'Generate Pre-Request Script'],
      ['post-response', 'Generate Post-Response Script'],
      ['docs', 'Generate Documentation']
    ])('uses the correct title for %s', (scriptType, title) => {
      renderAIAssist({ props: { scriptType } });
      expect(screen.getByRole('button', { name: title })).toBeInTheDocument();
    });
  });

  describe('popup interactions', () => {
    it('opens and closes the popup from the trigger and close button', () => {
      renderAIAssist();
      openPopup();

      expect(screen.getByRole('dialog', { name: 'Generate Tests' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(screen.queryByRole('dialog', { name: 'Generate Tests' })).not.toBeInTheDocument();
    });

    it('closes the popup when Escape is pressed', () => {
      renderAIAssist();
      openPopup();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog', { name: 'Generate Tests' })).not.toBeInTheDocument();
    });

    it('closes the popup when clicking outside', () => {
      renderAIAssist();
      openPopup();

      fireEvent.mouseDown(document.body);
      expect(screen.queryByRole('dialog', { name: 'Generate Tests' })).not.toBeInTheDocument();
    });
  });

  describe('prompt view', () => {
    it('shows suggestion chips when the prompt is empty', () => {
      renderAIAssist();
      openPopup();

      expect(screen.getByRole('button', { name: 'Status 200' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'JSON body' })).toBeInTheDocument();
    });

    it('shows docs suggestions for the docs script type', () => {
      renderAIAssist({ props: { scriptType: 'docs', currentScript: '# Overview' } });
      fireEvent.click(screen.getByRole('button', { name: 'Generate Documentation' }));

      expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Request' })).toBeInTheDocument();
    });

    it('hides suggestions once the user starts typing', () => {
      renderAIAssist();
      openPopup();

      fireEvent.change(screen.getByPlaceholderText('Describe what you want to generate...'), {
        target: { value: 'Add a status test' }
      });

      expect(screen.queryByRole('button', { name: 'Status 200' })).not.toBeInTheDocument();
    });

    it('keeps Generate disabled until the prompt has text', () => {
      renderAIAssist();
      openPopup();

      expect(screen.getByRole('button', { name: 'Generate' })).toBeDisabled();

      fireEvent.change(screen.getByPlaceholderText('Describe what you want to generate...'), {
        target: { value: 'Add a status test' }
      });

      expect(screen.getByRole('button', { name: 'Generate' })).toBeEnabled();
    });
  });

  describe('generation flow', () => {
    it('generates from a suggestion chip', async () => {
      renderAIAssist();
      openPopup();

      fireEvent.click(screen.getByRole('button', { name: 'Status 200' }));

      await waitFor(() => {
        expect(aiGenerateScript).toHaveBeenCalledWith({
          scriptType: 'tests',
          prompt: 'Add a test asserting the response status code is 200',
          currentScript: 'test("ok", () => {});',
          requestContext: undefined
        });
      });

      expect(screen.getByText('test("generated", () => {});')).toBeInTheDocument();
    });

    it('passes docs context for folder and collection documentation', async () => {
      const docsContext = {
        scope: 'folder',
        name: 'Users',
        collectionName: 'Pet Store API',
        folders: [{ name: 'Admin', requestCount: 1, subfolderCount: 0 }],
        requests: [{ name: 'List Users', method: 'GET', url: '{{base}}/users' }]
      };

      renderAIAssist({ props: { scriptType: 'docs', currentScript: '', docsContext } });
      fireEvent.click(screen.getByRole('button', { name: 'Generate Documentation' }));
      fireEvent.click(screen.getByRole('button', { name: 'Overview' }));

      await waitFor(() => {
        expect(aiGenerateScript).toHaveBeenCalledWith({
          scriptType: 'docs',
          prompt: 'Write an overview section describing the purpose and key features',
          currentScript: '',
          requestContext: undefined,
          docsContext
        });
      });
    });

    it('generates from the prompt input and passes request context', async () => {
      const requestContext = {
        method: 'GET',
        url: 'https://api.example.com/users',
        headers: [],
        params: [],
        body: null
      };

      renderAIAssist({ props: { requestContext } });
      openPopup();

      fireEvent.change(screen.getByPlaceholderText('Describe what you want to generate...'), {
        target: { value: 'Add auth header test' }
      });
      fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

      await waitFor(() => {
        expect(aiGenerateScript).toHaveBeenCalledWith({
          scriptType: 'tests',
          prompt: 'Add auth header test',
          currentScript: 'test("ok", () => {});',
          requestContext
        });
      });
    });

    it.each([
      ['metaKey', { metaKey: true }],
      ['ctrlKey', { ctrlKey: true }]
    ])('generates when pressing modifier+Enter using %s', async (_modifier, keyEvent) => {
      renderAIAssist();
      openPopup();

      const textarea = screen.getByPlaceholderText('Describe what you want to generate...');
      fireEvent.change(textarea, { target: { value: 'Add response time test' } });
      fireEvent.keyDown(textarea, { key: 'Enter', ...keyEvent });

      await waitFor(() => {
        expect(aiGenerateScript).toHaveBeenCalledWith({
          scriptType: 'tests',
          prompt: 'Add response time test',
          currentScript: 'test("ok", () => {});',
          requestContext: undefined
        });
      });
    });

    it('shows a loading state while generation is in progress', async () => {
      let resolveGenerate;
      aiGenerateScript.mockImplementation(() => new Promise((resolve) => {
        resolveGenerate = resolve;
      }));

      renderAIAssist();
      openPopup();
      fireEvent.click(screen.getByRole('button', { name: 'Status 200' }));

      expect(screen.getByText('Generating...')).toBeInTheDocument();

      resolveGenerate({ content: 'test("done", () => {});' });

      await waitFor(() => {
        expect(screen.getByText('test("done", () => {});')).toBeInTheDocument();
      });
    });

    it('shows an API error without entering preview mode', async () => {
      aiGenerateScript.mockResolvedValue({ error: 'Provider unavailable' });

      renderAIAssist();
      openPopup();
      fireEvent.click(screen.getByRole('button', { name: 'Status 200' }));

      await waitFor(() => {
        expect(screen.getByText('Provider unavailable')).toBeInTheDocument();
      });
      expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    });

    it('shows a fallback error when no content is returned', async () => {
      aiGenerateScript.mockResolvedValue({});

      renderAIAssist();
      openPopup();
      fireEvent.click(screen.getByRole('button', { name: 'Status 200' }));

      await waitFor(() => {
        expect(screen.getByText('No content was generated. Try rephrasing your prompt.')).toBeInTheDocument();
      });
    });
  });

  describe('preview and apply', () => {
    const showPreview = async () => {
      renderAIAssist();
      openPopup();
      fireEvent.click(screen.getByRole('button', { name: 'Status 200' }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
      });
    };

    it('uses the script preview label for script types', async () => {
      await showPreview();
      expect(screen.getByText('Preview · replaces current script')).toBeInTheDocument();
    });

    it('uses the documentation preview label for docs', async () => {
      aiGenerateScript.mockResolvedValue({ content: '# API Docs' });

      renderAIAssist({ props: { scriptType: 'docs', currentScript: '# Existing' } });
      fireEvent.click(screen.getByRole('button', { name: 'Generate Documentation' }));
      fireEvent.click(screen.getByRole('button', { name: 'Overview' }));

      await waitFor(() => {
        expect(screen.getByText('Preview · replaces current documentation')).toBeInTheDocument();
      });
      expect(screen.getByText('# API Docs')).toBeInTheDocument();
    });

    it('applies generated content and closes the popup', async () => {
      const onApply = jest.fn();
      renderAIAssist({ props: { onApply } });
      openPopup();
      fireEvent.click(screen.getByRole('button', { name: 'Status 200' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

      expect(onApply).toHaveBeenCalledWith('test("generated", () => {});');
      expect(screen.queryByRole('dialog', { name: 'Generate Tests' })).not.toBeInTheDocument();
    });

    it('returns to the prompt view when Back is clicked', async () => {
      await showPreview();

      fireEvent.click(screen.getByRole('button', { name: 'Back' }));

      expect(screen.getByPlaceholderText('Describe what you want to generate...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Status 200' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    });
  });
});
