import { useState } from 'react';
import { IconChevronDown, IconChevronRight } from '@tabler/icons';
import { toEntries } from '@usebruno/common/utils';

const HeaderTable = ({ entries, variant }) => {
  if (!entries.length) return <div className="tl-empty">No Headers</div>;
  return (
    <table className="tl-headers-table" data-testid={`tl-headers-table-${variant}`}>
      <tbody>
        {entries.map((h, i) => (
          <tr key={i} data-testid={`tl-header-row-${variant}`}>
            <td className="tl-headers-key" data-testid={`tl-header-name-${variant}`}>{h.name}</td>
            <td className="tl-headers-val" data-testid={`tl-header-value-${variant}`}>{String(h.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// One collapsible "Headers" block with a single flat table (no per-source grouping or pills).
// `rows` (request tab): pre-ordered header rows (default -> collection -> folder -> request -> script).
// `headers` (response tab): a raw headers object/array.
// `variant` ('request' | 'response') namespaces the test ids: the request and response tabs stay
// mounted together (display toggled), so a shared test id would match both tables at once.
const Headers = ({ headers, rows, variant = 'request' }) => {
  const [isOpen, setIsOpen] = useState(true);
  const entries = Array.isArray(rows) ? rows : toEntries(headers);

  return (
    <div className="tl-block">
      <button
        type="button"
        className="tl-block-h"
        aria-expanded={isOpen}
        data-testid={`headers-toggle-${variant}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="tl-block-chev">
          {isOpen ? <IconChevronDown size={12} strokeWidth={2} /> : <IconChevronRight size={12} strokeWidth={2} />}
        </span>
        Headers
        <span className="tl-block-count">({entries.length})</span>
      </button>
      {isOpen && <HeaderTable entries={entries} variant={variant} />}
    </div>
  );
};

export default Headers;
