import { useState } from 'react';
import { IconChevronDown, IconChevronRight } from '@tabler/icons';
import { toEntries } from '@usebruno/common/utils';

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

// One collapsible "Headers" block with a single flat table (no per-source grouping or pills).
// `rows` (request tab): pre-ordered header rows (default -> collection -> folder -> request -> script).
// `headers` (response tab): a raw headers object/array.
const Headers = ({ headers, rows }) => {
  const [isOpen, setIsOpen] = useState(true);
  const entries = Array.isArray(rows) ? rows : toEntries(headers);

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
        <span className="tl-block-count">({entries.length})</span>
      </button>
      {isOpen && <HeaderTable entries={entries} />}
    </div>
  );
};

export default Headers;
