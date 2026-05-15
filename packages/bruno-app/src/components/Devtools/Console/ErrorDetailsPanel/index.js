import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  IconX,
  IconBug,
  IconFileText,
  IconCode,
  IconStack,
  IconBrandGithub
} from '@tabler/icons';
import { clearSelectedError } from 'providers/ReduxStore/slices/logs';
import { useApp } from 'providers/App';
import platformLib from 'platform';
import StyledWrapper from './StyledWrapper';

const ErrorInfoTab = ({ error, t }) => {
  const { version } = useApp();

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const generateGitHubIssueUrl = () => {
    const title = `Bug: ${error.message.substring(0, 50)}${error.message.length > 50 ? '...' : ''}`;

    const body = `## Bug Report

### Error Details
- **Message**: ${error.message}
- **File**: ${error.filename || 'Unknown'}
- **Line**: ${error.lineno || 'Unknown'}:${error.colno || 'Unknown'}
- **Timestamp**: ${formatTimestamp(error.timestamp)}

### Environment
- **Bruno Version**: ${version}
- **OS**: ${platformLib.os.family} ${platformLib.os.version || ''}
- **Browser**: ${platformLib.name} ${platformLib.version || ''}

### Stack Trace
\`\`\`
${error.stack || 'No stack trace available'}
\`\`\`

### Arguments
\`\`\`
${error.args ? error.args.map((arg, index) => {
  if (arg && typeof arg === 'object' && arg.__type === 'Error') {
    return `[${index}]: Error: ${arg.message}`;
  }
  return `[${index}]: ${typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)}`;
}).join('\n') : 'No arguments'}
\`\`\`

### Steps to Reproduce
1. 
2. 
3. 

### Expected Behavior


### Additional Context

`;

    const encodedTitle = encodeURIComponent(title);
    const encodedBody = encodeURIComponent(body);

    return `https://github.com/usebruno/bruno/issues/new?template=BLANK_ISSUE&title=${encodedTitle}&body=${encodedBody}`;
  };

  const handleReportIssue = () => {
    const url = generateGitHubIssueUrl();
    window.open(url, '_blank');
  };

  return (
    <div className="tab-content">
      <div className="section">
        <h4>{t('DEVTOOLS.ERROR_INFORMATION')}</h4>
        <div className="info-grid">
          <div className="info-item">
            <label>{t('DEVTOOLS.MESSAGE')}:</label>
            <span className="error-message-full">{error.message || t('DEVTOOLS.NO_MESSAGE_AVAILABLE')}</span>
          </div>

          {error.filename && (
            <div className="info-item">
              <label>{t('DEVTOOLS.FILE')}:</label>
              <span className="file-path">{error.filename}</span>
            </div>
          )}

          {error.lineno && (
            <div className="info-item">
              <label>{t('DEVTOOLS.LINE')}:</label>
              <span>{error.lineno}{error.colno ? `:${error.colno}` : ''}</span>
            </div>
          )}

          <div className="info-item">
            <label>{t('DEVTOOLS.TIMESTAMP')}:</label>
            <span>{formatTimestamp(error.timestamp)}</span>
          </div>
        </div>
      </div>

      <div className="section">
        <h4>{t('DEVTOOLS.REPORT_ISSUE')}</h4>
        <div className="report-section">
          <p>{t('DEVTOOLS.REPORT_ISSUE_DESC')}</p>
          <button
            className="report-button"
            onClick={handleReportIssue}
            title={t('DEVTOOLS.REPORT_ISSUE_ON_GITHUB')}
          >
            <IconBrandGithub size={16} strokeWidth={1.5} />
            <span>{t('DEVTOOLS.REPORT_ISSUE_ON_GITHUB')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const StackTraceTab = ({ error, t }) => {
  const formatStackTrace = (stack) => {
    if (!stack) return t('DEVTOOLS.STACK_TRACE_NOT_AVAILABLE');

    return stack
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join('\n');
  };

  return (
    <div className="tab-content">
      <div className="section">
        <h4>{t('DEVTOOLS.STACK_TRACE')}</h4>
        <div className="stack-trace-container">
          <pre className="stack-trace">
            {formatStackTrace(error.stack)}
          </pre>
        </div>
      </div>
    </div>
  );
};

const ArgumentsTab = ({ error, t }) => {
  const formatArguments = (args) => {
    if (!args || args.length === 0) return t('DEVTOOLS.NO_ARGUMENTS_AVAILABLE');

    try {
      return args.map((arg, index) => {
        // Handle special Error object format
        if (arg && typeof arg === 'object' && arg.__type === 'Error') {
          return `[${index}]: Error: ${arg.message}\n  Name: ${arg.name}\n  Stack: ${arg.stack || 'No stack trace'}`;
        }

        if (typeof arg === 'object' && arg !== null) {
          return `[${index}]: ${JSON.stringify(arg, null, 2)}`;
        }

        return `[${index}]: ${String(arg)}`;
      }).join('\n\n');
    } catch (e) {
      return t('DEVTOOLS.ARGUMENTS_FORMAT_ERROR');
    }
  };

  return (
    <div className="tab-content">
      <div className="section">
        <h4>{t('DEVTOOLS.ARGUMENTS')}</h4>
        <div className="arguments-container">
          <pre className="arguments">
            {formatArguments(error.args)}
          </pre>
        </div>
      </div>
    </div>
  );
};

const ErrorDetailsPanel = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { selectedError } = useSelector((state) => state.logs);
  const [activeTab, setActiveTab] = useState('info');

  if (!selectedError) return null;

  const handleClose = () => {
    dispatch(clearSelectedError());
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getTabContent = () => {
    switch (activeTab) {
      case 'info':
        return <ErrorInfoTab error={selectedError} t={t} />;
      case 'stack':
        return <StackTraceTab error={selectedError} t={t} />;
      case 'args':
        return <ArgumentsTab error={selectedError} t={t} />;
      default:
        return <ErrorInfoTab error={selectedError} t={t} />;
    }
  };

  return (
    <StyledWrapper>
      <div className="panel-header">
        <div className="panel-title">
          <IconBug size={16} strokeWidth={1.5} />
          <span>{t('DEVTOOLS.ERROR_DETAILS')}</span>
          <span className="error-time">({formatTime(selectedError.timestamp)})</span>
        </div>

        <button
          className="close-button"
          onClick={handleClose}
          title={t('DEVTOOLS.CLOSE_DETAILS_PANEL')}
        >
          <IconX size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div className="panel-tabs">
        <button
          className={`tab-button ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          <IconFileText size={14} strokeWidth={1.5} />
          {t('DEVTOOLS.INFO')}
        </button>

        <button
          className={`tab-button ${activeTab === 'stack' ? 'active' : ''}`}
          onClick={() => setActiveTab('stack')}
        >
          <IconStack size={14} strokeWidth={1.5} />
          {t('DEVTOOLS.STACK')}
        </button>

        <button
          className={`tab-button ${activeTab === 'args' ? 'active' : ''}`}
          onClick={() => setActiveTab('args')}
        >
          <IconCode size={14} strokeWidth={1.5} />
          {t('DEVTOOLS.ARGS')}
        </button>
      </div>

      <div className="panel-content">
        {getTabContent()}
      </div>
    </StyledWrapper>
  );
};

export default ErrorDetailsPanel;
