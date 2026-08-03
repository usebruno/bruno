import { useState } from 'react';
import { IconChevronDown, IconChevronRight } from '@tabler/icons';

const toEntries = (headers) => {
  if (!headers) return [];
  if (Array.isArray(headers)) {
    return headers.map((h) => ({ name: h?.name, value: h?.value }));
  }
  return Object.entries(headers).map(([name, value]) => ({ name, value }));
};

const Headers = ({ headers }) => {
  const [isOpen, setIsOpen] = useState(true);
  const entries = toEntries(headers);
  const count = entries.length;

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
      {isOpen && (
        count === 0
          ? <div className="tl-empty">No Headers</div>
          : (
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
            )
      )}
    </div>
  );
};

export default Headers;
