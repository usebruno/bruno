import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { IconBrandGithub, IconCopy } from '@tabler/icons';
import ActionableToast from 'components/Toast/ActionableToast';
import StyledWrapper from './StyledWrapper';

const GITHUB_ISSUES_URL = 'https://github.com/usebruno/bruno/issues/new';

const ImportIssuesToastContent = ({ issues, summary }) => {
  const [includeItems, setIncludeItems] = useState(false);
  const hasSourceItems = issues.some((i) => i.sourceItem);

  const issuesSummary = issues.map((i) => `[${i.severity.toUpperCase()}] ${i.path} — ${i.message}`).join('\n');

  const formatSourceItems = () => {
    if (!includeItems) return '';
    const itemsWithSource = issues.filter((i) => i.sourceItem);
    if (itemsWithSource.length === 0) return '';
    const itemsJson = itemsWithSource
      .map((i) => `// ${i.path}\n${JSON.stringify(i.sourceItem, null, 2)}`)
      .join('\n\n');
    return `\n\n### Failed Items\n> **Please redact any sensitive information (API keys, tokens, passwords, internal URLs) before submitting.**\n\`\`\`json\n${itemsJson}\n\`\`\``;
  };

  const handleCopy = () => {
    let text = issuesSummary;
    if (includeItems) {
      const itemsWithSource = issues.filter((i) => i.sourceItem);
      if (itemsWithSource.length > 0) {
        const itemsText = itemsWithSource
          .map((i) => `// ${i.path}\n${JSON.stringify(i.sourceItem, null, 2)}`)
          .join('\n\n');
        text += `\n\nFailed Items:\n${itemsText}`;
      }
    }
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard', { duration: 2000 });
  };

  const handleReport = () => {
    const title = `Postman import: ${summary}`;
    const body = [
      '### Description',
      'Postman collection import completed with issues. Some items could not be converted.',
      '',
      '### Import Issues',
      '```',
      issuesSummary,
      '```',
      formatSourceItems(),
      '',
      '### Steps to Reproduce',
      '1. Import the attached Postman collection (redact sensitive data before attaching)',
      '2. ',
      '',
      '### Additional Context',
      ''
    ].join('\n');
    const params = new URLSearchParams({ title, body, labels: 'bug' });
    window.open(`${GITHUB_ISSUES_URL}?${params.toString()}`, '_blank');
  };

  return (
    <StyledWrapper>
      <div className="toast-title" data-testid="import-issues-toast-title">Imported with issues: {summary}</div>
      <div className="toast-hint">Open DevTools console to see which items failed and why.</div>
      {hasSourceItems && (
        <label className="toast-checkbox">
          <input
            type="checkbox"
            checked={includeItems}
            onChange={(e) => setIncludeItems(e.target.checked)}
            data-testid="import-issues-include-items-checkbox"
          />
          <div className="toast-checkbox-text">
            <span className="toast-checkbox-label">Include failed request data</span>
            <span className="toast-checkbox-desc">Attaches the raw Postman request items that failed. May contain API keys, tokens, or internal URLs.</span>
          </div>
        </label>
      )}
      <div className="toast-actions">
        <button className="toast-btn" onClick={handleReport} data-testid="import-issues-report-btn">
          <IconBrandGithub size={13} />
          Report on GitHub
        </button>
        <button className="toast-btn" onClick={handleCopy} data-testid="import-issues-copy-btn">
          <IconCopy size={13} />
          Copy Issues
        </button>
      </div>
    </StyledWrapper>
  );
};

/**
 * Show an import issues toast in the bottom-right corner.
 * Aggregates all issues into a single toast — does not stack.
 */
let activeImportToastId = null;

export const showImportIssuesToast = (issues) => {
  if (activeImportToastId) {
    toast.dismiss(activeImportToastId);
  }

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const parts = [];
  if (errors.length > 0) parts.push(`${errors.length} item(s) skipped`);
  if (warnings.length > 0) parts.push(`${warnings.length} warning(s)`);
  const summary = parts.join(', ');

  activeImportToastId = toast.custom(
    (t) => (
      <ActionableToast t={t} testId="import-issues-toast">
        <ImportIssuesToastContent issues={issues} summary={summary} />
      </ActionableToast>
    ),
    { duration: Infinity, position: 'bottom-right' }
  );

  return activeImportToastId;
};

export default ImportIssuesToastContent;
