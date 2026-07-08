import { useState } from 'react';
import { IconChevronDown, IconChevronRight } from '@tabler/icons';
import { toEntries } from '@usebruno/common/utils';

const HeaderTable = ({ entries, onNavigate }) => {
  if (!entries.length) return <div className="tl-empty">No Headers</div>;
  return (
    <table className="tl-headers-table">
      <tbody>
        {entries.map((h, i) => (
          <tr key={i}>
            <td className="tl-headers-key">{h.name}</td>
            <td className="tl-headers-val">{String(h.value)}</td>
            {onNavigate && (
              <td className="tl-headers-act">
                {h.nav && (
                  <button
                    type="button"
                    className="tl-headers-goto"
                    title="Open source"
                    aria-label="Open header source"
                    data-testid="header-goto"
                    onClick={() => onNavigate(h.nav)}
                  >
                    <IconChevronRight size={14} strokeWidth={2} />
                  </button>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const countSection = (section) =>
  Array.isArray(section.children)
    ? section.children.reduce((sum, c) => sum + countSection(c), 0)
    : section.entries.length;

// A collapsible block: a headers table (leaf), or nested sections when `children` is present.
// `pillClass` renders the label as a colored source pill; every section starts open.
const CollapsibleSection = ({ section, onNavigate, testId = 'headers-section-toggle' }) => {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = Array.isArray(section.children);
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
        {section.pillClass ? <span className={`tl-pill ${section.pillClass}`}>{section.label}</span> : section.label}
        <span className="tl-block-count">({countSection(section)})</span>
      </button>
      {isOpen
        && (hasChildren ? (
          section.children.length ? (
            <div className="tl-block-sections">
              {section.children.map((child) => (
                <CollapsibleSection key={child.key} section={child} onNavigate={onNavigate} />
              ))}
            </div>
          ) : (
            <div className="tl-empty">No Headers</div>
          )
        ) : (
          <HeaderTable entries={section.entries} onNavigate={onNavigate} />
        ))}
    </div>
  );
};

// `sections` (request tab): the "Headers" wrapper holding per-source sub-sections.
// `headers` (response tab): a single flat "Headers" section. Both render as the same collapsible.
const Headers = ({ headers, sections, onNavigate }) => {
  const rootSection = Array.isArray(sections)
    ? { label: 'Headers', children: sections }
    : { label: 'Headers', entries: toEntries(headers) };

  return <CollapsibleSection section={rootSection} onNavigate={onNavigate} testId="headers-toggle" />;
};

export default Headers;
