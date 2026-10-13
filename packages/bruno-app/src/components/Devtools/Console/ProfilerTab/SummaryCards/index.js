import React from 'react';
import { Delta } from '../MetricTable';
import { fmtMs, fmtNum, fmtRatio } from '../format';

// Render time is not summed here: probe timings are inclusive of children, so adding
// them double-counts every nested component.
const CARDS = [
  { key: 'dispatches', label: 'dispatches', get: (s) => s.totals.dispatches, format: fmtNum },
  { key: 'dispatchMs', label: 'dispatch ms', get: (s) => s.totals.dispatchMs, format: fmtMs },
  { key: 'renders', label: 'renders', get: (s) => s.totals.renders, format: fmtNum },
  { key: 'rendersPerDispatch', label: 'renders / dispatch', get: (s) => s.totals.rendersPerDispatch, format: fmtRatio },
  { key: 'selectorCalls', label: 'selector calls', get: (s) => s.totals.selectorCalls, format: fmtNum },
  { key: 'selectorRecomputes', label: 'selector recomputes', get: (s) => s.totals.selectorRecomputes, format: fmtNum }
];

const SummaryCards = ({ snapshot, baseline }) => (
  <div className="state-grid" data-testid="profiler-summary">
    {CARDS.map((card) => {
      const value = card.get(snapshot);
      return (
        <div className="state-cell" key={card.key}>
          <span className="label">{card.label}</span>
          <span className="value">{card.format(value)}</span>
          {baseline ? <Delta current={value} baseline={card.get(baseline)} format={card.format} /> : null}
        </div>
      );
    })}
  </div>
);

export default SummaryCards;
