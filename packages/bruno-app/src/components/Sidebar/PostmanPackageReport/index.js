import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
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

const PostmanPackageReport = ({ report, collectionPath, onClose }) => {
  const { t } = useTranslation();
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

  const getInstallFailureMessage = (result) => {
    switch (result?.errorCode) {
      case 'NPM_NOT_FOUND':
        return t('POSTMAN_PACKAGE.NPM_NOT_FOUND');
      case 'TIMEOUT':
        return t('POSTMAN_PACKAGE.TIMEOUT');
      case 'SPAWN_FAILED':
      case 'SPAWN_ERROR':
        return t('POSTMAN_PACKAGE.SPAWN_FAILED');
      default:
        return t('POSTMAN_PACKAGE.INSTALL_FAILED', { exitCode: result?.exitCode });
    }
  };

  const installFailureMessage = installFailed ? getInstallFailureMessage(installResult) : '';

  const handleInstall = async () => {
    if (!collectionPath) {
      toast.error(t('POSTMAN_PACKAGE.NO_PATH'));
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
          t('POSTMAN_PACKAGE.INSTALLED_SUCCESS', { count: needsInstall.length })
        );
      } else {
        toast.error(t('POSTMAN_PACKAGE.INSTALL_FAILED_DETAIL'));
      }
    } catch (err) {
      console.error('Install failed:', err);
      setInstallResult({ success: false, stderr: err?.message || String(err), exitCode: -1 });
      toast.error(t('POSTMAN_PACKAGE.INSTALL_START_FAILED'));
    } finally {
      setInstalling(false);
    }
  };

  const handleSwitchToDeveloperMode = () => {
    if (!collection?.uid) {
      toast.error(t('POSTMAN_PACKAGE.COLLECTION_NOT_FOUND'));
      return;
    }
    setSwitchingMode(true);
    dispatch(saveCollectionSecurityConfig(collection.uid, { jsSandboxMode: 'developer' }))
      .then(() => toast.success(t('POSTMAN_PACKAGE.DEV_MODE_ENABLED')))
      .catch((err) => {
        console.error(err);
        toast.error(t('POSTMAN_PACKAGE.SWITCH_MODE_FAILED'));
      })
      .finally(() => setSwitchingMode(false));
  };

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText(installCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t('POSTMAN_PACKAGE.COPY_FAILED'));
    }
  };

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
          {idx === shown.length - 1 && remainder > 0 ? t('POSTMAN_PACKAGE.AND_MORE', { count: remainder }) : ''}
        </Fragment>
      );
    });
  };

  const isDismissAction = installDone || needsInstall.length === 0;
  const confirmText = installDone
    ? t('COMMON.DONE')
    : installing
      ? t('POSTMAN_PACKAGE.INSTALLING')
      : needsInstall.length > 0
        ? t('POSTMAN_PACKAGE.INSTALL_PACKAGES_BTN', { count: needsInstall.length })
        : t('COMMON.DONE');
  const handleConfirm = isDismissAction ? onClose : handleInstall;

  return (
    <StyledWrapper>
      <Modal
        size="md"
        title={t('POSTMAN_PACKAGE.INSTALL_PACKAGES_TITLE')}
        confirmText={confirmText}
        cancelText={t('COMMON.SKIP')}
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
              <span className="pkg-section-title">{t('POSTMAN_PACKAGE.PACKAGES_IN_SCRIPTS')}</span>
              <span className="pkg-section-count">{needsInstall.length}</span>
            </div>
            {!installing && !installDone && (
              <p className="pkg-section-help">
                {t('POSTMAN_PACKAGE.PACKAGES_HELP')}
              </p>
            )}
            <PackageList items={needsInstall} />

            {!installing && !installDone && (
              <div className="pkg-cmd-block">
                <div className="pkg-cmd-label">
                  <IconTerminal2 size={12} strokeWidth={1.75} />
                  <span>{t('POSTMAN_PACKAGE.INSTALL_MANUALLY')}</span>
                </div>
                <div className="pkg-cmd-row">
                  <code className="pkg-cmd-code">{installCommand}</code>
                  <button
                    type="button"
                    className="pkg-cmd-copy"
                    onClick={handleCopyCommand}
                    aria-label={t('POSTMAN_PACKAGE.COPY_COMMAND')}
                  >
                    {copied ? <IconCheck size={14} strokeWidth={1.75} /> : <IconCopy size={14} strokeWidth={1.5} />}
                  </button>
                </div>
              </div>
            )}

            {installing && (
              <div className="pkg-inline-status pkg-inline-info">
                <IconLoader2 size={14} strokeWidth={1.75} className="pkg-spin" />
                <span>{t('POSTMAN_PACKAGE.INSTALLING_COUNT', { count: needsInstall.length })}</span>
              </div>
            )}

            {installDone && (
              <div className="pkg-inline-status pkg-inline-success">
                <IconCircleCheck size={14} strokeWidth={1.75} />
                <span>
                  {t('POSTMAN_PACKAGE.INSTALLED_INTO_COLLECTION', { count: (installResult.installed || needsInstall).length })}
                </span>
              </div>
            )}
          </div>
        )}

        {needsDevModeOnly && !installDone && !installing && (
          <div className="pkg-section pkg-devmode">
            <div className="pkg-devmode-head">
              <IconAlertTriangle size={18} strokeWidth={1.75} />
              <span className="pkg-devmode-title">{t('POSTMAN_PACKAGE.NEEDS_DEV_MODE')}</span>
            </div>
            <p className="pkg-devmode-desc">
              {t('POSTMAN_PACKAGE.NEEDS_DEV_MODE_DESC', { packages: renderPackageExamples(devMode) })}
            </p>
            <PackageList items={devMode} />
            <div className="pkg-devmode-trust">
              <IconShieldLock size={15} strokeWidth={1.75} />
              <span>{t('POSTMAN_PACKAGE.TRUST_WARNING')}</span>
            </div>
            <Button
              color="primary"
              size="sm"
              loading={switchingMode}
              icon={<IconCode size={15} strokeWidth={2} />}
              onClick={handleSwitchToDeveloperMode}
              data-testid="switch-to-developer-mode"
            >
              {t('POSTMAN_PACKAGE.SWITCH_TO_DEV_MODE')}
            </Button>
          </div>
        )}

        {unsupported.length > 0 && !installDone && !installing && (
          <div className="pkg-section pkg-section-danger">
            <div className="pkg-section-head">
              <IconBan size={14} strokeWidth={1.75} />
              <span className="pkg-section-title">{t('POSTMAN_PACKAGE.NOT_SUPPORTED')}</span>
              <span className="pkg-section-count">{unsupported.length}</span>
            </div>
            <p className="pkg-section-help">
              {t('POSTMAN_PACKAGE.NOT_SUPPORTED_DESC')}
            </p>
            <PackageList items={unsupported} />
          </div>
        )}

        {installDone && (
          isDeveloperMode ? (
            <div className="pkg-status pkg-status-success">
              <IconCircleCheck size={14} strokeWidth={1.75} />
              <span>{t('POSTMAN_PACKAGE.RUNS_DEV_MODE')}</span>
            </div>
          ) : (
            <div className="pkg-section pkg-devmode">
              <div className="pkg-devmode-head">
                <IconAlertTriangle size={18} strokeWidth={1.75} />
                <span className="pkg-devmode-title">{t('POSTMAN_PACKAGE.EXTERNAL_MODULES_DEV_MODE')}</span>
              </div>
              <p className="pkg-devmode-desc">
                {t('POSTMAN_PACKAGE.SAFE_MODE_WARNING', { packages: renderPackageExamples(installResult.installed || needsInstall) })}
              </p>
              <div className="pkg-devmode-trust">
                <IconShieldLock size={15} strokeWidth={1.75} />
                <span>{t('POSTMAN_PACKAGE.TRUST_WARNING')}</span>
              </div>
              <Button
                color="primary"
                size="sm"
                loading={switchingMode}
                icon={<IconCode size={15} strokeWidth={2} />}
                onClick={handleSwitchToDeveloperMode}
                data-testid="switch-to-developer-mode"
              >
                {t('POSTMAN_PACKAGE.SWITCH_TO_DEV_MODE')}
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
