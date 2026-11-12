import { useEffect, useRef, useState } from 'react';
import {
  IconAlertCircle,
  IconBrandGithub,
  IconCheck,
  IconChevronDown,
  IconCopy,
  IconExternalLink,
  IconLoader2,
  IconLogout,
  IconRefresh,
  IconTerminal2,
  IconUserCircle,
  IconX
} from '@tabler/icons';
import toast from 'react-hot-toast';
import ActionIcon from 'ui/ActionIcon';
import Button from 'ui/Button';
import Checkbox from 'ui/Checkbox';
import { useTheme } from 'providers/Theme';
import useCopyToClipboard from 'hooks/useCopyToClipboard';
import { formatIpcError } from 'utils/common/error';
import {
  copilotCancelSignIn,
  copilotRefreshModels,
  copilotSignIn,
  copilotSignInWithGitHubCli,
  copilotSignOut,
  formatCopilotMultiplier
} from 'utils/ai';
import StyledWrapper from './StyledWrapper';

const stopBubble = (e) => e.stopPropagation();

const openExternal = (url) => window?.ipcRenderer?.openExternal(url);

const CopilotProviderCard = ({
  provider,
  providerEnabled,
  providerToggle,
  copilot,
  models,
  isModelEnabled,
  onToggleModel,
  onStatusChange,
  onSignOut,
  onSignedIn
}) => {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [codeAutoCopied, setCodeAutoCopied] = useState(false);
  const { copied: codeCopied, copyToClipboard } = useCopyToClipboard(1500);

  const prev = useRef({ enabled: providerEnabled });
  const disabledBySignOut = useRef(false);
  useEffect(() => {
    const was = prev.current;
    if (!was.enabled && providerEnabled) {
      setExpanded(true);
    } else if (was.enabled && !providerEnabled && !disabledBySignOut.current) {
      setExpanded(false);
    }
    disabledBySignOut.current = false;
    prev.current = { enabled: providerEnabled };
  }, [providerEnabled]);

  const previousState = useRef(copilot.state);
  useEffect(() => {
    if (previousState.current !== 'signed-in' && copilot.state === 'signed-in' && !providerEnabled) {
      onSignedIn?.();
    }
    previousState.current = copilot.state;
  }, [copilot.state, providerEnabled, onSignedIn]);

  const signedIn = copilot.state === 'signed-in';
  const signingIn = copilot.state === 'signing-in';
  const errorMessage = feedback || copilot.error;

  const runAction = async (name, action, fallbackMessage) => {
    setBusy(name);
    setFeedback(null);
    try {
      return await action();
    } catch (err) {
      setFeedback(formatIpcError(err) || fallbackMessage);
      return null;
    } finally {
      setBusy(null);
    }
  };

  const handleCopyCode = () => copyToClipboard(copilot.userCode).then(
    () => toast.success('Code copied to clipboard'),
    () => toast.error('Could not copy the code')
  );

  const handleSignIn = () => runAction('sign-in', async () => {
    const status = await copilotSignIn();
    onStatusChange?.(status);
    const { userCode, verificationUri } = status?.copilot || {};
    if (userCode) setCodeAutoCopied(await navigator.clipboard.writeText(userCode).then(() => true, () => false));
    if (verificationUri) openExternal(verificationUri);
  }, 'GitHub sign-in could not start');

  const handleSignInWithGitHubCli = () => runAction('github-cli', async () => {
    onStatusChange?.(await copilotSignInWithGitHubCli());
  }, 'Could not use the GitHub CLI account');

  const handleCancelSignIn = () => runAction('cancel', async () => {
    onStatusChange?.(await copilotCancelSignIn());
    setCodeAutoCopied(false);
  }, 'Failed to cancel sign-in');

  const handleRefreshModels = () => runAction('refresh', async () => {
    onStatusChange?.(await copilotRefreshModels());
  }, 'Failed to refresh models');

  const handleSignOut = () => runAction('sign-out', async () => {
    onStatusChange?.(await copilotSignOut());
    disabledBySignOut.current = providerEnabled;
    onSignOut?.();
    toast.success('Signed out of GitHub Copilot');
  }, 'Failed to sign out');

  const enabledModelsCount = models.filter((m) => isModelEnabled(m.id)).length;

  let statusText = 'Not signed in';
  if (signingIn) {
    statusText = 'Waiting for GitHub';
  } else if (signedIn) {
    statusText = models.length > 0 ? `${enabledModelsCount}/${models.length} models` : 'No models available';
  }

  return (
    <StyledWrapper className={`provider-row ${expanded ? 'expanded' : ''}`} data-testid={`ai-provider-${provider.id}`}>
      <div
        className="provider-header flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
        data-testid={`ai-provider-${provider.id}-header`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <IconBrandGithub size={18} strokeWidth={1.5} className="provider-logo flex-shrink-0" />
          <span className="font-semibold text-[12.5px]">{provider.label}</span>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <span className={`provider-status inline-flex items-center gap-1.5 text-[11px] ${signedIn ? 'configured' : ''}`}>
            <span className={`status-dot w-[7px] h-[7px] rounded-full ${signedIn ? 'configured' : ''}`} />
            {statusText}
          </span>
          <span className="flex items-center" onClick={stopBubble}>
            {providerToggle}
          </span>
          <span className={`chevron flex items-center ${expanded ? 'expanded' : ''}`}>
            <IconChevronDown size={16} strokeWidth={1.5} />
          </span>
        </div>
      </div>

      <div className={`provider-body-wrapper ${expanded ? 'open' : ''}`}>
        <div className="provider-body-inner">
          <div className="provider-body flex flex-col gap-3.5 px-3 pt-3 pb-3" onClick={stopBubble}>
            {!signedIn && !signingIn && (
              <div className="flex flex-col gap-2.5">
                <div className="copilot-intro text-[11px]">
                  Sign in with GitHub to use your Copilot plan in Bruno. If you use the GitHub CLI, you can use the
                  account <code>gh</code> is signed in to instead.
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    icon={<IconBrandGithub size={14} strokeWidth={1.5} />}
                    loading={busy === 'sign-in'}
                    disabled={busy !== null}
                    onClick={handleSignIn}
                    data-testid="ai-copilot-sign-in"
                  >
                    Sign in with GitHub
                  </Button>
                  <button
                    type="button"
                    className="copilot-option-btn"
                    disabled={busy !== null}
                    onClick={handleSignInWithGitHubCli}
                    data-testid="ai-copilot-use-github-cli"
                  >
                    {busy === 'github-cli'
                      ? <IconLoader2 size={14} className="spin" />
                      : <IconTerminal2 size={14} strokeWidth={1.5} />}
                    <span>Use GitHub CLI</span>
                  </button>
                </div>
              </div>
            )}

            {signingIn && (
              <div className="flex flex-col gap-2.5">
                <div className="copilot-intro text-[11px]">
                  Enter this code on GitHub to approve Bruno.
                  {codeAutoCopied ? ' It has been copied to your clipboard.' : ''}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="copilot-code px-3 py-1" data-testid="ai-copilot-user-code">
                    {copilot.userCode}
                  </span>
                  <ActionIcon label="Copy code" onClick={handleCopyCode} data-testid="ai-copilot-copy-code">
                    {codeCopied ? <IconCheck size={15} strokeWidth={1.5} /> : <IconCopy size={15} strokeWidth={1.5} />}
                  </ActionIcon>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    icon={<IconExternalLink size={14} strokeWidth={1.5} />}
                    onClick={() => openExternal(copilot.verificationUri)}
                    data-testid="ai-copilot-open-github"
                  >
                    Open GitHub
                  </Button>
                  <button
                    type="button"
                    className="copilot-option-btn"
                    disabled={busy !== null}
                    onClick={handleCancelSignIn}
                    data-testid="ai-copilot-cancel-sign-in"
                  >
                    <IconX size={14} strokeWidth={1.5} />
                    <span>Cancel</span>
                  </button>
                </div>
                <div className="copilot-hint inline-flex items-center gap-1.5 text-[11px]">
                  <IconLoader2 size={12} className="spin" />
                  Waiting for GitHub…
                </div>
              </div>
            )}

            {signedIn && (
              <div className="copilot-account flex items-center justify-between gap-2 h-8 box-border pl-2.5 pr-1">
                <div className="flex items-center gap-2 min-w-0">
                  {copilot.account?.avatarUrl ? (
                    <img className="copilot-avatar" src={copilot.account.avatarUrl} alt="" />
                  ) : (
                    <IconUserCircle size={20} strokeWidth={1.5} className="copilot-avatar" />
                  )}
                  <span className="text-xs font-medium truncate" data-testid="ai-copilot-account">
                    {copilot.account?.login ? `@${copilot.account.login}` : 'GitHub account'}
                  </span>
                  {copilot.authSource === 'github-cli' && (
                    <span className="copilot-hint text-[11px] truncate" data-testid="ai-copilot-auth-source">
                      via GitHub CLI
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <ActionIcon
                    label="Refresh models"
                    onClick={handleRefreshModels}
                    disabled={busy !== null}
                    data-testid="ai-copilot-refresh-models"
                  >
                    <IconRefresh size={15} strokeWidth={1.5} className={busy === 'refresh' ? 'spin' : ''} />
                  </ActionIcon>
                  <ActionIcon
                    label="Sign out"
                    onClick={handleSignOut}
                    disabled={busy !== null}
                    colorOnHover={theme.colors.text.danger}
                    data-testid="ai-copilot-sign-out"
                  >
                    {busy === 'sign-out' ? <IconLoader2 size={15} className="spin" /> : <IconLogout size={15} strokeWidth={1.5} />}
                  </ActionIcon>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="feedback error flex items-center gap-1.5 text-[11px] px-2 py-1" role="alert">
                <IconAlertCircle size={12} />
                {errorMessage}
              </div>
            )}

            {signedIn && models.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <div className="models-label-row flex items-center justify-between text-[11px]">
                  <span>Models</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {models.map((model) => {
                    const enabled = isModelEnabled(model.id);
                    const disabled = !providerEnabled;
                    const tag = formatCopilotMultiplier(model.multiplier);
                    return (
                      <div
                        key={model.id}
                        className={`model-chip flex items-center gap-2 px-2.5 py-1.5 select-none ${enabled && !disabled ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                      >
                        <Checkbox
                          size="sm"
                          className="min-w-0 flex-1"
                          label={model.label}
                          checked={enabled}
                          disabled={disabled}
                          onChange={() => onToggleModel(model.id, !enabled)}
                          data-testid={`ai-copilot-model-${model.id}`}
                        />
                        {tag && <span className="copilot-model-tag ml-auto">{tag}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default CopilotProviderCard;
