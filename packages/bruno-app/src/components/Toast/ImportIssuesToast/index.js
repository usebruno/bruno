import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { IconAlertCircle, IconBrandGithub, IconCopy, IconX } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const GITHUB_ISSUES_URL = 'https://github.com/usebruno/bruno/issues/new';
const MAX_URL_LENGTH = 8000;

const ImportIssuesToastContent = ({ t, issues, summary }) => {
  const [includeItems, setIncludeItems] = useState(false);
  const hasSourceItems = issues.some((i) => i.sourceItem);

  const issuesSummary = issues.map((i) => `[${i.severity.toUpperCase()}] ${i.path} — ${i.message}`).join('\n');

  const buildIssueBody = () => {
    const sections = [
      '### Description',
      'Postman collection import completed with issues. Some items could not be converted.',
      '',
      '### Import Issues',
      '```',
      issuesSummary,
      '```'
    ];

    if (includeItems) {
      const itemsWithSource = issues.filter((i) => i.sourceItem);
      if (itemsWithSource.length > 0) {
        const itemsJson = itemsWithSource
          .map((i) => `// ${i.path}\n${JSON.stringify(i.sourceItem, null, 2)}`)
          .join('\n\n');
        sections.push(
          '',
          '### Failed Items',
          '> **Please redact any sensitive information (API keys, tokens, passwords, internal URLs) before submitting.**',
          '```json',
          itemsJson,
          '```'
        );
      }
    }

    sections.push(
      '',
      '### Steps to Reproduce',
      '1. Import the attached Postman collection (redact sensitive data before attaching)',
      '2. ',
      '',
      '### Additional Context',
      ''
    );

    return sections.join('\n');
  };

  const isUrlTooLong = useMemo(() => {
    const title = `Postman import: ${summary}`;
    const body = buildIssueBody();
    const params = new URLSearchParams({ title, body, labels: 'bug' });
    return `${GITHUB_ISSUES_URL}?${params.toString()}`.length > MAX_URL_LENGTH;
  }, [issues, summary, includeItems]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(issuesSummary);
      toast.success('Copied to clipboard', { duration: 2000 });
    } catch (err) {
      toast.error('Failed to copy to clipboard', { duration: 3000 });
    }
  };

  const handleReport = async () => {
    const title = `Postman import: ${summary}`;
    const body = buildIssueBody();

    if (!isUrlTooLong) {
      const params = new URLSearchParams({ title, body, labels: 'bug' });
      window.open(`${GITHUB_ISSUES_URL}?${params.toString()}`, '_blank');
      return;
    }

    try {
      await navigator.clipboard.writeText(body);
      toast.success('Issue details copied — paste them into the GitHub issue body', { duration: 5000 });
    } catch (err) {
      toast.error('Failed to copy to clipboard', { duration: 3000 });
    }
    const params = new URLSearchParams({ title, labels: 'bug' });
    window.open(`${GITHUB_ISSUES_URL}?${params.toString()}`, '_blank');
  };

  return (
    <StyledWrapper
      data-testid="import-issues-toast"
      style={{
        opacity: t.visible ? 1 : 0,
        transform: t.visible ? 'translateX(0)' : 'translateX(100%)'
      }}
    >
      <div className="toast-accent" />
      <div className="toast-body">
        <button
          type="button"
          className="toast-close"
          aria-label="Close toast"
          data-testid="import-issues-toast-close"
          onClick={() => toast.dismiss(t.id)}
        >
          <IconX size={14} />
        </button>
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
        {isUrlTooLong && (
          <div className="toast-warning" data-testid="import-issues-url-too-long-warning">
            <IconAlertCircle size={14} className="toast-warning-icon" />
            <span>Issue details are too long to embed in the URL. Clicking &quot;Report on GitHub&quot; will copy them to your clipboard — paste it once the GitHub issue page opens.</span>
          </div>
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
      <ImportIssuesToastContent t={t} issues={issues} summary={summary} />
    ),
    { duration: Infinity, position: 'bottom-right' }
  );

  return activeImportToastId;
};

export default ImportIssuesToastContent;
