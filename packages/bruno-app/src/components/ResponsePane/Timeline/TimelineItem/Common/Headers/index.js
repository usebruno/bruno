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

const countSection = (section) =>
  Array.isArray(section.children)
    ? section.children.reduce((sum, c) => sum + countSection(c), 0)
    : section.entries.length;

// A collapsible section. Renders a headers table, or nested sections when `children` is present.
// `pillClass` renders the label as a colored source pill; sections start collapsed.
const CollapsibleSection = ({ section, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const hasChildren = Array.isArray(section.children);
  return (
    <div className="tl-block">
      <button
        type="button"
        className="tl-block-h"
        aria-expanded={isOpen}
        data-testid="headers-section-toggle"
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
          <div className="tl-block-sections">
            {section.children.map((child) => (
              <CollapsibleSection key={child.key} section={child} />
            ))}
          </div>
        ) : (
          <HeaderTable entries={section.entries} />
        ))}
    </div>
  );
};

// `sections` (request tab): an open "Headers" wrapper holding collapsible per-source sections.
// `headers` (response tab): a single flat, collapsible "Headers" section.
const Headers = ({ headers, sections }) => {
  const [isOpen, setIsOpen] = useState(true);

  const isTree = Array.isArray(sections);
  const rootSection = isTree
    ? { label: 'Headers', children: sections }
    : { label: 'Headers', entries: toEntries(headers) };
  const count = countSection(rootSection);

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
      {isOpen
        && (isTree ? (
          <div className="tl-block-sections">
            {sections.length
              ? sections.map((s) => <CollapsibleSection key={s.key} section={s} />)
              : <div className="tl-empty">No Headers</div>}
          </div>
        ) : (
          <HeaderTable entries={rootSection.entries} />
        ))}
    </div>
  );
};

export default Headers;
