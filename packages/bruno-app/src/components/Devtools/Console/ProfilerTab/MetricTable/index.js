import React from 'react';

// Changes smaller than this are noise between runs, not a result.
const NOISE = 0.02;

/**
 * One cell's change against the baseline. Lower is better unless the column says
 * otherwise (hit rate). Hidden when there is no baseline value to compare to.
 */
export const Delta = ({ current, baseline, format, higherIsBetter = false }) => {
  if (baseline === undefined || baseline === null) return null;
  const diff = current - baseline;
  const rel = baseline !== 0 ? diff / Math.abs(baseline) : diff === 0 ? 0 : Infinity;

  if (Math.abs(rel) < NOISE) {
    return <span className="delta same">±0</span>;
  }

  const improved = higherIsBetter ? diff > 0 : diff < 0;
  const sign = diff > 0 ? '+' : '−';
  const pct = Number.isFinite(rel) ? ` ${sign}${Math.round(Math.abs(rel) * 100)}%` : ' new';

  return (
    <span className={`delta ${improved ? 'better' : 'worse'}`} title={`baseline ${format(baseline)}`}>
      {sign}{format(Math.abs(diff))}{pct}
    </span>
  );
};

const zeroLike = (row, columns) => {
  const out = { name: row.name };
  columns.forEach((c) => {
    if (c.key !== 'name') out[c.key] = typeof row[c.key] === 'number' ? 0 : '';
  });
  return out;
};

/**
 * Rows present only in the baseline are kept, zeroed — "RequestTabPanel: 0 renders,
 * −100%" is exactly the result a before/after comparison is looking for.
 */
const mergeWithBaseline = (rows, baselineRows, columns) => {
  if (!baselineRows) return rows.map((row) => ({ row, base: null }));
  const baseByName = new Map(baselineRows.map((r) => [r.name, r]));
  const seen = new Set();
  const merged = rows.map((row) => {
    seen.add(row.name);
    return { row, base: baseByName.get(row.name) || null, isNew: !baseByName.has(row.name) };
  });
  baselineRows.forEach((base) => {
    if (!seen.has(base.name)) merged.push({ row: zeroLike(base, columns), base, isGone: true });
  });
  return merged;
};

// Text cells can be cut off with an ellipsis, so they carry their full text as a tooltip.
// A column can supply its own (the full list behind a top-N cell); otherwise the rendered
// text is used. Never String() an object or array — that is how "[object Object]" appears.
const cellTooltip = (column, row, content) => {
  if (column.tooltip) return column.tooltip(row) || undefined;
  if (typeof content === 'string' || typeof content === 'number') return String(content);
  return undefined;
};

const MetricTable = ({ rows, baselineRows, columns, isHot, limit = 30, emptyText, testId }) => {
  const merged = mergeWithBaseline(rows, baselineRows, columns);

  if (!merged.length) {
    return <div className="empty">{emptyText || 'Nothing recorded yet, press Record, then use the app.'}</div>;
  }

  return (
    <div className="table-scroll">
      <table className="profiler-table" data-testid={testId}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.num ? 'num' : ''} title={c.title}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {merged.slice(0, limit).map(({ row, base, isNew, isGone }) => (
            <tr
              key={row.name}
              className={[isHot && isHot(row) ? 'hot' : '', isGone ? 'gone' : ''].join(' ').trim()}
            >
              {columns.map((c) => {
                const value = row[c.key];
                const content = c.render ? c.render(row) : c.format ? c.format(value ?? 0) : value;
                return (
                  <td key={c.key} className={c.num ? 'num' : 'name'} title={c.num ? undefined : cellTooltip(c, row, content)}>
                    {content}
                    {c.key === 'name' && isNew && baselineRows ? <span className="tag">new</span> : null}
                    {c.key === 'name' && isGone ? <span className="tag">baseline only</span> : null}
                    {c.delta && base ? (
                      <Delta current={value ?? 0} baseline={base[c.key] ?? 0} format={c.format} higherIsBetter={c.higherIsBetter} />
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MetricTable;
