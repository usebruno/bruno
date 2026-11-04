import '@testing-library/jest-dom';
import React, { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';

global.React = React;

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() }
}));

jest.mock('providers/Theme', () => ({
  useTheme: () => ({ theme: { colors: { text: { danger: '#dc2626' } } } })
}));

jest.mock('utils/ai', () => ({
  copilotSignIn: jest.fn(),
  copilotCancelSignIn: jest.fn(),
  copilotSaveToken: jest.fn(),
  copilotSignOut: jest.fn(),
  copilotRefreshModels: jest.fn()
}));

import {
  copilotCancelSignIn,
  copilotRefreshModels,
  copilotSaveToken,
  copilotSignIn,
  copilotSignOut
} from 'utils/ai';
import CopilotProviderCard from './index';

const theme = themes.light;

const provider = { id: 'github-copilot', label: 'GitHub Copilot', configured: false };

const signedOut = { state: 'signed-out', authMethod: null, userCode: null, verificationUri: null, account: null, error: null };
const signingIn = { ...signedOut, state: 'signing-in', userCode: 'ABCD-1234', verificationUri: 'https://github.com/login/device' };
const signedIn = { ...signedOut, state: 'signed-in', authMethod: 'device', account: { login: 'octocat', name: 'Octo Cat', avatarUrl: '' } };

const models = [
  { id: 'github-copilot:gpt-4o', label: 'GPT-4o', provider: 'github-copilot', multiplier: 0 },
  { id: 'github-copilot:claude', label: 'Claude', provider: 'github-copilot', multiplier: 3 },
  { id: 'github-copilot:gpt-5', label: 'GPT-5', provider: 'github-copilot', multiplier: 1 }
];

const CardWithTokenToggle = ({ initialTokenInputOpen = false, onTokenInputOpenChange, ...props }) => {
  const [tokenInputOpen, setTokenInputOpen] = useState(initialTokenInputOpen);
  return (
    <CopilotProviderCard
      {...props}
      tokenInputOpen={tokenInputOpen}
      onTokenInputOpenChange={(open) => {
        setTokenInputOpen(open);
        onTokenInputOpenChange(open);
      }}
    />
  );
};

const renderCard = (props = {}) => {
  const onStatusChange = jest.fn();
  const onSignOut = jest.fn();
  const onTokenInputOpenChange = jest.fn();
  const view = render(
    <ThemeProvider theme={theme}>
      <CardWithTokenToggle
        provider={provider}
        providerEnabled
        providerToggle={<span>toggle</span>}
        copilot={signedOut}
        models={[]}
        isModelEnabled={() => true}
        onToggleModel={jest.fn()}
        onStatusChange={onStatusChange}
        onSignOut={onSignOut}
        onTokenInputOpenChange={onTokenInputOpenChange}
        {...props}
      />
    </ThemeProvider>
  );
  return { onStatusChange, onSignOut, onTokenInputOpenChange, unmount: view.unmount };
};

describe('CopilotProviderCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.ipcRenderer = { openExternal: jest.fn() };
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
      configurable: true
    });
  });

  it('starts the device flow, copies the code and opens GitHub', async () => {
    const nextStatus = { copilot: signingIn };
    copilotSignIn.mockResolvedValue(nextStatus);
    const { onStatusChange } = renderCard();

    fireEvent.click(screen.getByTestId('ai-copilot-sign-in'));

    await waitFor(() => expect(onStatusChange).toHaveBeenCalledWith(nextStatus));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ABCD-1234');
    expect(window.ipcRenderer.openExternal).toHaveBeenCalledWith('https://github.com/login/device');
  });

  it('shows the failure when sign-in cannot start', async () => {
    copilotSignIn.mockRejectedValue(new Error('GitHub sign-in could not start (HTTP 502)'));
    renderCard();

    fireEvent.click(screen.getByTestId('ai-copilot-sign-in'));

    expect(await screen.findByRole('alert')).toHaveTextContent('GitHub sign-in could not start (HTTP 502)');
  });

  it('shows the copy icon, not a check, after the code is copied automatically at sign-in', async () => {
    copilotSignIn.mockResolvedValue({ copilot: signingIn });
    const { onStatusChange } = renderCard();

    fireEvent.click(screen.getByTestId('ai-copilot-sign-in'));
    await waitFor(() => expect(onStatusChange).toHaveBeenCalled());
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ABCD-1234'));

    expect(toast.success).not.toHaveBeenCalled();
  });

  it('starts with the copy icon while waiting for GitHub', () => {
    renderCard({ copilot: signingIn });
    const copyButton = screen.getByTestId('ai-copilot-copy-code');

    expect(copyButton.querySelector('.icon-tabler-copy')).toBeInTheDocument();
    expect(copyButton.querySelector('.icon-tabler-check')).not.toBeInTheDocument();
  });

  it('confirms each copy of the code and resets the icon afterwards', async () => {
    jest.useFakeTimers();
    renderCard({ copilot: signingIn });
    const copyButton = screen.getByTestId('ai-copilot-copy-code');

    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ABCD-1234');
    expect(toast.success).toHaveBeenCalledWith('Code copied to clipboard');
    expect(copyButton.querySelector('.icon-tabler-check')).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(1500);
    });
    expect(copyButton.querySelector('.icon-tabler-copy')).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('tells the user when the code could not be copied', async () => {
    navigator.clipboard.writeText.mockRejectedValue(new Error('denied'));
    renderCard({ copilot: signingIn });

    fireEvent.click(screen.getByTestId('ai-copilot-copy-code'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not copy the code'));
  });

  it('shows the user code while waiting and lets the user cancel', async () => {
    copilotCancelSignIn.mockResolvedValue({ copilot: signedOut });
    const { onStatusChange } = renderCard({ copilot: signingIn });

    expect(screen.getByTestId('ai-copilot-user-code')).toHaveTextContent('ABCD-1234');
    expect(screen.getByText('Waiting for GitHub…')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('ai-copilot-open-github'));
    expect(window.ipcRenderer.openExternal).toHaveBeenCalledWith('https://github.com/login/device');

    fireEvent.click(screen.getByTestId('ai-copilot-cancel-sign-in'));
    await waitFor(() => expect(onStatusChange).toHaveBeenCalledWith({ copilot: signedOut }));
  });

  it('saves a pasted token', async () => {
    const nextStatus = { copilot: { ...signedIn, authMethod: 'pat' } };
    copilotSaveToken.mockResolvedValue(nextStatus);
    const { onStatusChange } = renderCard();

    expect(screen.queryByTestId('ai-copilot-token-input')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('ai-copilot-use-token'));
    expect(screen.getByTestId('ai-copilot-save-token')).toBeDisabled();

    fireEvent.change(screen.getByTestId('ai-copilot-token-input'), { target: { value: ' github_pat_abc ' } });
    fireEvent.click(screen.getByTestId('ai-copilot-save-token'));

    await waitFor(() => expect(onStatusChange).toHaveBeenCalledWith(nextStatus));
    expect(copilotSaveToken).toHaveBeenCalledWith({ token: 'github_pat_abc' });
  });

  it('toggles the token field open and closed from the same button', () => {
    renderCard();
    const toggle = screen.getByTestId('ai-copilot-use-token');

    fireEvent.click(toggle);
    expect(screen.getByTestId('ai-copilot-token-input')).toBeInTheDocument();
    expect(toggle).toHaveClass('selected');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(toggle);
    expect(screen.queryByTestId('ai-copilot-token-input')).not.toBeInTheDocument();
    expect(toggle).not.toHaveClass('selected');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the token field with Escape and forgets the typed token', () => {
    renderCard();
    fireEvent.click(screen.getByTestId('ai-copilot-use-token'));
    fireEvent.change(screen.getByTestId('ai-copilot-token-input'), { target: { value: 'github_pat_abc' } });

    fireEvent.keyDown(screen.getByTestId('ai-copilot-token-input'), { key: 'Escape' });
    expect(screen.queryByTestId('ai-copilot-token-input')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('ai-copilot-use-token'));
    expect(screen.getByTestId('ai-copilot-token-input')).toHaveValue('');
  });

  it('keeps the token field open when the card is collapsed and expanded again', () => {
    renderCard();
    const header = screen.getByText('GitHub Copilot').closest('[role="button"]');

    fireEvent.click(header);
    fireEvent.click(screen.getByTestId('ai-copilot-use-token'));
    fireEvent.click(header);
    fireEvent.click(header);

    expect(screen.getByTestId('ai-copilot-token-input')).toBeInTheDocument();
    expect(screen.getByTestId('ai-copilot-use-token')).toHaveClass('selected');
  });

  it('reports the open and closed choice so the page can remember it', () => {
    const { onTokenInputOpenChange } = renderCard();

    fireEvent.click(screen.getByTestId('ai-copilot-use-token'));
    fireEvent.click(screen.getByTestId('ai-copilot-use-token'));

    expect(onTokenInputOpenChange.mock.calls).toEqual([[true], [false]]);
  });

  it('shows the token field when it was left open, without the typed token', () => {
    const first = renderCard();
    fireEvent.click(screen.getByTestId('ai-copilot-use-token'));
    fireEvent.change(screen.getByTestId('ai-copilot-token-input'), { target: { value: 'github_pat_abc' } });
    first.unmount();

    renderCard({ initialTokenInputOpen: true });

    expect(screen.getByTestId('ai-copilot-token-input')).toHaveValue('');
    expect(screen.getByTestId('ai-copilot-use-token')).toHaveClass('selected');
  });

  it('keeps the token field closed when it was left closed', () => {
    renderCard({ initialTokenInputOpen: false });

    expect(screen.queryByTestId('ai-copilot-token-input')).not.toBeInTheDocument();
    expect(screen.getByTestId('ai-copilot-use-token')).not.toHaveClass('selected');
  });

  it('closes the token field when GitHub sign-in starts', async () => {
    copilotSignIn.mockResolvedValue({ copilot: signingIn });
    renderCard();
    fireEvent.click(screen.getByTestId('ai-copilot-use-token'));

    fireEvent.click(screen.getByTestId('ai-copilot-sign-in'));

    await waitFor(() => expect(screen.queryByTestId('ai-copilot-token-input')).not.toBeInTheDocument());
  });

  it('shows why a pasted token was rejected', async () => {
    copilotSaveToken.mockRejectedValue(new Error('GitHub rejected this token.'));
    renderCard();

    fireEvent.click(screen.getByTestId('ai-copilot-use-token'));
    fireEvent.change(screen.getByTestId('ai-copilot-token-input'), { target: { value: 'ghp_classic' } });
    fireEvent.click(screen.getByTestId('ai-copilot-save-token'));

    expect(await screen.findByRole('alert')).toHaveTextContent('GitHub rejected this token.');
  });

  it('renders the account, sign-in method, model tags and actions when signed in', async () => {
    copilotRefreshModels.mockResolvedValue({ copilot: signedIn });
    copilotSignOut.mockResolvedValue({ copilot: signedOut });
    const { onStatusChange, onSignOut } = renderCard({ copilot: signedIn, models, provider: { ...provider, configured: true } });

    expect(screen.getByTestId('ai-copilot-account')).toHaveTextContent('@octocat');
    expect(screen.getByTestId('ai-copilot-auth-method')).toHaveTextContent('Signed in with GitHub');
    expect(screen.getByText('3/3 models')).toBeInTheDocument();
    expect(screen.getByText('Included')).toBeInTheDocument();
    expect(screen.getByText('3×')).toBeInTheDocument();
    expect(screen.queryByText('1×')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('ai-copilot-refresh-models'));
    await waitFor(() => expect(onStatusChange).toHaveBeenCalledWith({ copilot: signedIn }));
    await waitFor(() => expect(screen.getByTestId('ai-copilot-sign-out')).toBeEnabled());

    fireEvent.click(screen.getByTestId('ai-copilot-sign-out'));
    await waitFor(() => expect(onStatusChange).toHaveBeenCalledWith({ copilot: signedOut }));
    expect(onSignOut).toHaveBeenCalled();
  });

  it('shows main-process errors without Electron\'s remote-method prefix', async () => {
    copilotRefreshModels.mockRejectedValue(
      new Error('Error invoking remote method \'renderer:ai-copilot-refresh-models\': Error: Failed to load Copilot models from api.githubcopilot.com (HTTP 503)')
    );
    renderCard({ copilot: signedIn, models });

    fireEvent.click(screen.getByTestId('ai-copilot-refresh-models'));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Failed to load Copilot models from api.githubcopilot.com (HTTP 503)');
    expect(alert).not.toHaveTextContent('Error invoking remote method');
  });

  it('toggles a model from its checkbox', () => {
    const onToggleModel = jest.fn();
    renderCard({ copilot: signedIn, models, onToggleModel, isModelEnabled: (id) => id !== 'github-copilot:claude' });

    expect(screen.getByTestId('ai-copilot-model-github-copilot:gpt-4o')).toBeChecked();
    fireEvent.click(screen.getByTestId('ai-copilot-model-github-copilot:claude'));

    expect(onToggleModel).toHaveBeenCalledWith('github-copilot:claude', true);
  });

  describe('expanded state when the provider turns off', () => {
    const cardProps = (overrides = {}) => ({
      provider,
      providerToggle: <span>toggle</span>,
      models: [],
      isModelEnabled: () => true,
      onToggleModel: jest.fn(),
      onStatusChange: jest.fn(),
      onTokenInputOpenChange: jest.fn(),
      ...overrides
    });
    const renderWithTheme = (props) => (
      <ThemeProvider theme={theme}>
        <CardWithTokenToggle {...props} />
      </ThemeProvider>
    );
    const isExpanded = () => screen.getByTestId('ai-provider-github-copilot').classList.contains('expanded');

    it('stays expanded after signing out, even though sign-out turns the provider off', async () => {
      copilotSignOut.mockResolvedValue({ copilot: signedOut });
      const onSignOut = jest.fn();
      const { rerender } = render(renderWithTheme(cardProps({ providerEnabled: true, copilot: signedIn, onSignOut })));
      fireEvent.click(screen.getByText('GitHub Copilot').closest('[role="button"]'));
      expect(isExpanded()).toBe(true);

      fireEvent.click(screen.getByTestId('ai-copilot-sign-out'));
      await waitFor(() => expect(onSignOut).toHaveBeenCalled());
      rerender(renderWithTheme(cardProps({ providerEnabled: false, copilot: signedOut, onSignOut })));

      expect(isExpanded()).toBe(true);
      expect(screen.getByTestId('ai-copilot-sign-in')).toBeInTheDocument();
    });

    it('still collapses when the provider toggle is switched off', () => {
      const { rerender } = render(renderWithTheme(cardProps({ providerEnabled: true, copilot: signedIn })));
      fireEvent.click(screen.getByText('GitHub Copilot').closest('[role="button"]'));
      expect(isExpanded()).toBe(true);

      rerender(renderWithTheme(cardProps({ providerEnabled: false, copilot: signedIn })));

      expect(isExpanded()).toBe(false);
    });
  });

  it('labels a pasted-token session', () => {
    renderCard({ copilot: { ...signedIn, authMethod: 'pat' } });
    expect(screen.getByTestId('ai-copilot-auth-method')).toHaveTextContent('Using a personal access token');
  });

  it('surfaces a missing Copilot seat for a signed-in account', () => {
    renderCard({ copilot: { ...signedIn, error: 'This GitHub account does not have access to Copilot.' } });
    expect(screen.getByRole('alert')).toHaveTextContent('does not have access to Copilot');
    expect(screen.getByText('No models available')).toBeInTheDocument();
  });
});
