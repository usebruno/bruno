import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  IconAlertTriangle,
  IconBan,
  IconCheck,
  IconCircleCheck,
  IconCode,
  IconCopy,
  IconLoader2,
  IconPackage,
  IconShieldLock,
  IconTerminal2
} from '@tabler/icons';
import Modal from 'components/Modal';
import Button from 'ui/Button';
import { saveCollectionSecurityConfig } from 'providers/ReduxStore/slices/collections/actions';
import { findCollectionByPathname } from 'utils/collections';
import StyledWrapper from './StyledWrapper';

const PackageList = ({ items }) => (
  <ul className="pkg-list">
    {items.map((name) => (
      <li key={name} className="pkg-list-item">
        <IconPackage size={12} strokeWidth={1.75} />
        <span>{name}</span>
      </li>
    ))}
  </ul>
);

// Renders "`a` and `b`" / "`a`, `b` and `c`" / "`a`, `b` and 3 more" as inline
// code spans for use inside a sentence.
const renderPackageExamples = (names = []) => {
  const shown = names.slice(0, 3);
  const remainder = names.length - shown.length;
  return shown.map((name, idx) => {
    let separator = '';
    if (idx > 0) {
      separator = idx === shown.length - 1 && remainder === 0 ? ' and ' : ', ';
    }
    return (
      <Fragment key={name}>
        {separator}
        <code>{name}</code>
        {idx === shown.length - 1 && remainder > 0 ? ` and ${remainder} more` : ''}
      </Fragment>
    );
  });
};

// Maps an install result's errorCode to a user-facing message. Falls back to a
// generic exit-code message for plain non-zero exits.
const getInstallFailureMessage = (result) => {
  switch (result?.errorCode) {
    case 'NPM_NOT_FOUND':
      return 'npm was not found on your PATH. Install Node.js/npm, then retry or run the command manually.';
    case 'TIMEOUT':
      return 'npm install timed out. Try running the command manually in a terminal.';
    case 'SPAWN_FAILED':
    case 'SPAWN_ERROR':
      return 'Could not start npm install. Try running the command manually.';
    default:
      return `npm install failed (exit code ${result?.exitCode}). Try the manual command above.`;
  }
};

const PostmanPackageReport = ({ report, collectionPath, onClose }) => {
  const dispatch = useDispatch();
  const collections = useSelector((state) => state.collections.collections);
  const collection = useMemo(
    () => findCollectionByPathname(collections, collectionPath),
    [collections, collectionPath]
  );
  const sandboxMode = collection?.securityConfig?.jsSandboxMode || 'safe';
  const isDeveloperMode = sandboxMode === 'developer';

  const [installing, setInstalling] = useState(false);
  const [installResult, setInstallResult] = useState(null);
  const [switchingMode, setSwitchingMode] = useState(false);
  const [copied, setCopied] = useState(false);

  const needsInstall = report?.needsInstall || [];
  const unsupported = report?.unsupported || [];
  const devMode = report?.devMode || [];

  const installCommand = useMemo(
    () => (needsInstall.length ? `npm install --save ${needsInstall.join(' ')}` : ''),
    [needsInstall]
  );

  const needsDevModeOnly
    = needsInstall.length === 0 && devMode.length > 0 && !isDeveloperMode;
  const hasActionable
    = needsInstall.length > 0 || unsupported.length > 0 || needsDevModeOnly;

  useEffect(() => {
    if (report && !hasActionable) onClose();
  }, [report, hasActionable, onClose]);

  if (!report || !hasActionable) return null;

  const installDone = installResult && installResult.success;
  const installFailed = installResult && !installResult.success;
  const installFailureMessage = installFailed ? getInstallFailureMessage(installResult) : '';

  const handleInstall = async () => {
    if (!collectionPath) {
      toast.error('Cannot install: collection path not available.');
      return;
    }
    if (needsInstall.length === 0) return;

    setInstalling(true);
    setInstallResult(null);
    try {
      const result = await window.ipcRenderer.invoke(
        'renderer:install-postman-packages',
        collectionPath,
        needsInstall
      );
      setInstallResult(result);
      if (result.success) {
        toast.success(
          `Installed ${needsInstall.length} package${needsInstall.length === 1 ? '' : 's'}`
        );
      } else {
        toast.error('npm install failed. See details below.');
      }
    } catch (err) {
      console.error('Install failed:', err);
      setInstallResult({ success: false, stderr: err?.message || String(err), exitCode: -1 });
      toast.error('Failed to start npm install');
    } finally {
      setInstalling(false);
    }
  };

  const handleSwitchToDeveloperMode = () => {
    if (!collection?.uid) {
      toast.error('Could not locate the imported collection to switch modes.');
      return;
    }
    setSwitchingMode(true);
    dispatch(saveCollectionSecurityConfig(collection.uid, { jsSandboxMode: 'developer' }))
      .then(() => toast.success('Developer Mode enabled'))
      .catch((err) => {
        console.error(err);
        toast.error('Failed to switch sandbox mode');
      })
      .finally(() => setSwitchingMode(false));
  };

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText(installCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const isDismissAction = installDone || needsInstall.length === 0;
  const confirmText = installDone
    ? 'Done'
    : installing
      ? 'Installing…'
      : needsInstall.length > 0
        ? `Install ${needsInstall.length} package${needsInstall.length === 1 ? '' : 's'}`
        : 'Done';
  const handleConfirm = isDismissAction ? onClose : handleInstall;

  return (
    <StyledWrapper>
      <Modal
        size="md"
        title="Install packages"
        confirmText={confirmText}
        cancelText="Skip"
        hideCancel={installDone || (needsInstall.length === 0 && !installFailed)}
        confirmDisabled={installing}
        confirmButtonColor={isDismissAction ? 'secondary' : 'primary'}
        handleConfirm={handleConfirm}
        handleCancel={onClose}
        dataTestId="postman-package-report-modal"
        disableCloseOnOutsideClick
      >
        {needsInstall.length > 0 && (
          <div className="pkg-section">
            <div className="pkg-section-head">
              <span className="pkg-section-title">Packages used in scripts</span>
              <span className="pkg-section-count">{needsInstall.length}</span>
            </div>
            {!installing && !installDone && (
              <p className="pkg-section-help">
                These npm packages are referenced by scripts in your imported collection but aren't
                installed in this collection's folder.
              </p>
            )}
            <PackageList items={needsInstall} />

            {!installing && !installDone && (
              <div className="pkg-cmd-block">
                <div className="pkg-cmd-label">
                  <IconTerminal2 size={12} strokeWidth={1.75} />
                  <span>Or install manually</span>
                </div>
                <div className="pkg-cmd-row">
                  <code className="pkg-cmd-code">{installCommand}</code>
                  <button
                    type="button"
                    className="pkg-cmd-copy"
                    onClick={handleCopyCommand}
                    aria-label="Copy command"
                  >
                    {copied ? <IconCheck size={14} strokeWidth={1.75} /> : <IconCopy size={14} strokeWidth={1.5} />}
                  </button>
                </div>
              </div>
            )}

            {installing && (
              <div className="pkg-inline-status pkg-inline-info">
                <IconLoader2 size={14} strokeWidth={1.75} className="pkg-spin" />
                <span>Installing {needsInstall.length} package{needsInstall.length === 1 ? '' : 's'}…</span>
              </div>
            )}

            {installDone && (
              <div className="pkg-inline-status pkg-inline-success">
                <IconCircleCheck size={14} strokeWidth={1.75} />
                <span>
                  Installed {(installResult.installed || needsInstall).length} package
                  {(installResult.installed || needsInstall).length === 1 ? '' : 's'} into this collection.
                </span>
              </div>
            )}
          </div>
        )}

        {needsDevModeOnly && !installDone && !installing && (
          <div className="pkg-section pkg-devmode">
            <div className="pkg-devmode-head">
              <IconAlertTriangle size={18} strokeWidth={1.75} />
              <span className="pkg-devmode-title">Scripts use libraries that need Developer Mode</span>
            </div>
            <p className="pkg-devmode-desc">
              Your imported scripts call {renderPackageExamples(devMode)}
              {', '}which need <strong>Developer Mode</strong> to run.
            </p>
            <PackageList items={devMode} />
            <div className="pkg-devmode-trust">
              <IconShieldLock size={15} strokeWidth={1.75} />
              <span>Only enable Developer Mode for collections you trust.</span>
            </div>
            <Button
              color="primary"
              size="sm"
              loading={switchingMode}
              icon={<IconCode size={15} strokeWidth={2} />}
              onClick={handleSwitchToDeveloperMode}
              data-testid="switch-to-developer-mode"
            >
              Switch to Developer Mode
            </Button>
          </div>
        )}

        {unsupported.length > 0 && !installDone && !installing && (
          <div className="pkg-section pkg-section-danger">
            <div className="pkg-section-head">
              <IconBan size={14} strokeWidth={1.75} />
              <span className="pkg-section-title">Not supported in Bruno</span>
              <span className="pkg-section-count">{unsupported.length}</span>
            </div>
            <p className="pkg-section-help">
              Postman-specific packages without a Bruno equivalent. Scripts that call these will
              fail at runtime.
            </p>
            <PackageList items={unsupported} />
          </div>
        )}

        {installDone && (
          isDeveloperMode ? (
            <div className="pkg-status pkg-status-success">
              <IconCircleCheck size={14} strokeWidth={1.75} />
              <span>
                This collection runs in <strong>Developer Mode</strong> - your scripts can use these
                packages right away.
              </span>
            </div>
          ) : (
            <div className="pkg-section pkg-devmode">
              <div className="pkg-devmode-head">
                <IconAlertTriangle size={18} strokeWidth={1.75} />
                <span className="pkg-devmode-title">External modules require Developer Mode</span>
              </div>
              <p className="pkg-devmode-desc">
                Custom npm packages (such as {renderPackageExamples(installResult.installed || needsInstall)})
                {' '}are installed, but this collection is currently running in <strong>Safe Mode</strong>.
              </p>
              <div className="pkg-devmode-trust">
                <IconShieldLock size={15} strokeWidth={1.75} />
                <span>Only enable Developer Mode for collections you trust.</span>
              </div>
              <Button
                color="primary"
                size="sm"
                loading={switchingMode}
                icon={<IconCode size={15} strokeWidth={2} />}
                onClick={handleSwitchToDeveloperMode}
                data-testid="switch-to-developer-mode"
              >
                Switch to Developer Mode
              </Button>
            </div>
          )
        )}

        {installFailed && (
          <div className="pkg-status pkg-status-danger" data-testid="postman-package-install-error">
            <div className="pkg-status-head">
              <IconAlertTriangle size={14} strokeWidth={1.75} />
              <span>{installFailureMessage}</span>
            </div>
            {(installResult.stderr || installResult.stdout) && (
              <pre className="pkg-status-log">
                {(installResult.stderr || installResult.stdout).slice(-1200)}
              </pre>
            )}
          </div>
        )}
      </Modal>
    </StyledWrapper>
  );
};

export default PostmanPackageReport;
