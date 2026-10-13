import React from 'react';
import { getInsights, getResolvedInsights } from 'utils/profiler/insights';

const SEVERITY_LABEL = { high: 'high', medium: 'medium', info: 'info' };

const InsightRow = ({ insight, isNew }) => (
  <li className={`insight severity-${insight.severity}`} data-testid="profiler-insight">
    <div className="insight-head">
      <span className={`badge ${insight.severity}`}>{SEVERITY_LABEL[insight.severity]}</span>
      <span className="insight-title">{insight.title}</span>
      {isNew ? <span className="tag">new since baseline</span> : null}
    </div>
    {insight.evidence ? <div className="insight-evidence">{insight.evidence}</div> : null}
    <div className="insight-suggestion">{insight.suggestion}</div>
  </li>
);

const Insights = ({ snapshot, baseline }) => {
  const insights = getInsights(snapshot);
  const baselineInsights = baseline ? getInsights(baseline) : null;
  const baselineIds = baselineInsights ? new Set(baselineInsights.map((i) => i.id)) : null;
  const resolved = baselineInsights ? getResolvedInsights(insights, baselineInsights) : [];

  if (!insights.length && !resolved.length) {
    return (
      <div className="empty">
        Nothing flagged. Findings appear once there is enough data, record a scenario for a few seconds.
      </div>
    );
  }

  return (
    <>
      {insights.length ? (
        <ul className="insights" data-testid="profiler-insights">
          {insights.map((insight) => (
            <InsightRow key={insight.id} insight={insight} isNew={baselineIds && !baselineIds.has(insight.id)} />
          ))}
        </ul>
      ) : null}

      {resolved.length ? (
        <>
          <h5 className="resolved-title">Resolved since baseline ({resolved.length})</h5>
          <ul className="insights resolved" data-testid="profiler-insights-resolved">
            {resolved.map((insight) => (
              <li key={insight.id} className="insight resolved">
                <div className="insight-head">
                  <span className="badge resolved">resolved</span>
                  <span className="insight-title">{insight.title}</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
};

export default Insights;
