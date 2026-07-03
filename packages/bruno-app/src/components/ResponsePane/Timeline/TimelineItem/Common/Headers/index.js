import { useState } from 'react';
import { IconChevronDown, IconChevronRight } from '@tabler/icons';

export const toEntries = (headers) => {
  if (!headers) return [];
  if (Array.isArray(headers)) {
    return headers.map((h) => ({ name: h?.name, value: h?.value }));
  }
  return Object.entries(headers).map(([name, value]) => ({ name, value }));
};

const HeaderTable = ({ entries }) => {
  if (!entries.length) return <div className="tl-empty">No Headers</div>;
  return (
    <table className="tl-headers-table">
      <tbody>
        {entries.map((h, i) => (
          <tr key={i}>
            <td className="tl-headers-key">{h.name}</td>
            <td className="tl-headers-val">{String(h.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// A collapsible headers block. `pillClass` (optional) renders the label as a colored source pill.
const HeaderSection = ({ label, pillClass, entries, defaultOpen = true, testId = 'headers-toggle' }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="tl-block">
      <button
        type="button"
        className="tl-block-h"
        aria-expanded={isOpen}
        data-testid={testId}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="tl-block-chev">
          {isOpen ? <IconChevronDown size={12} strokeWidth={2} /> : <IconChevronRight size={12} strokeWidth={2} />}
        </span>
        {pillClass ? <span className={`tl-pill ${pillClass}`}>{label}</span> : label}
        <span className="tl-block-count">({entries.length})</span>
      </button>
      {isOpen && <HeaderTable entries={entries} />}
    </div>
  );
};

// Outer "Headers" wrapper, open by default, holding the per-source sections.
const HeadersContainer = ({ count, children }) => {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="tl-block">
      <button
        type="button"
        className="tl-block-h"
        aria-expanded={isOpen}
        data-testid="headers-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="tl-block-chev">
          {isOpen ? <IconChevronDown size={12} strokeWidth={2} /> : <IconChevronRight size={12} strokeWidth={2} />}
        </span>
        Headers
        <span className="tl-block-count">({count})</span>
      </button>
      {isOpen && <div className="tl-block-sections">{children}</div>}
    </div>
  );
};

// `groups` (request tab): an open "Headers" wrapper with a collapsed, pill-labelled section per
// header source. `headers` (response tab): a single flat, collapsible "Headers" section.
const Headers = ({ headers, groups }) => {
  if (Array.isArray(groups)) {
    const visible = groups.filter((g) => g.entries.length > 0);
    const total = visible.reduce((sum, g) => sum + g.entries.length, 0);
    return (
      <HeadersContainer count={total}>
        {visible.length
          ? visible.map((g) => (
              <HeaderSection
                key={g.key}
                label={g.label}
                pillClass={g.pillClass}
                entries={g.entries}
                defaultOpen={false}
                testId="headers-section-toggle"
              />
            ))
          : <div className="tl-empty">No Headers</div>}
      </HeadersContainer>
    );
  }

  return <HeaderSection label="Headers" entries={toEntries(headers)} />;
};

export default Headers;
