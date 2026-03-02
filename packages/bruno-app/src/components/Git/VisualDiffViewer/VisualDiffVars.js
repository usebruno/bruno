import React, { useMemo } from 'react';
import get from 'lodash/get';

const VisualDiffVars = ({ oldData, newData, showSide }) => {
  const oldVars = get(oldData, 'request.vars', {});
  const newVars = get(newData, 'request.vars', {});

  const currentVars = showSide === 'old' ? oldVars : newVars;
  const otherVars = showSide === 'old' ? newVars : oldVars;

  const currentReqVars = currentVars.req || [];
  const otherReqVars = otherVars.req || [];

  const currentResVars = currentVars.res || [];
  const otherResVars = otherVars.res || [];

  const computeVarsDiff = (currentList, otherList) => {
    const otherMap = new Map();
    otherList.forEach((v) => {
      otherMap.set(v.name, v);
    });

    return currentList.map((variable) => {
      const otherVar = otherMap.get(variable.name);

      let status = 'unchanged';
      if (!otherVar) {
        status = showSide === 'old' ? 'deleted' : 'added';
      } else if (
        variable.value !== otherVar.value
        || variable.enabled !== otherVar.enabled
        || variable.local !== otherVar.local
      ) {
        status = 'modified';
      }

      return { ...variable, status };
    });
  };

  const reqVarsWithStatus = useMemo(
    () => computeVarsDiff(currentReqVars, otherReqVars),
    [currentReqVars, otherReqVars, showSide]
  );

  const resVarsWithStatus = useMemo(
    () => computeVarsDiff(currentResVars, otherResVars),
    [currentResVars, otherResVars, showSide]
  );

  const renderVarsTable = (vars, title) => {
    if (vars.length === 0) return null;

    return (
      <div className="diff-section">
        <div className="diff-section-header">{title}</div>
        <table className="diff-table">
          <thead>
            <tr>
              <th style={{ width: '30px' }}></th>
              <th className="checkbox-cell"></th>
              <th style={{ width: '20%' }}>Name</th>
              <th>Value</th>
              <th style={{ width: '60px' }}>Scope</th>
            </tr>
          </thead>
          <tbody>
            {vars.map((variable, index) => (
              <tr key={`${variable.name}-${index}`} className={variable.status}>
                <td>
                  {variable.status !== 'unchanged' && (
                    <span className={`status-badge ${variable.status}`}>
                      {variable.status === 'added' ? 'A' : variable.status === 'deleted' ? 'D' : 'M'}
                    </span>
                  )}
                </td>
                <td className="checkbox-cell">
                  <input type="checkbox" checked={variable.enabled !== false} readOnly disabled />
                </td>
                <td className="key-cell">{variable.name}</td>
                <td className="value-cell">{variable.value}</td>
                <td className="value-cell">{variable.local ? 'Local' : 'Global'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (reqVarsWithStatus.length === 0 && resVarsWithStatus.length === 0) {
    return null;
  }

  return (
    <>
      {renderVarsTable(reqVarsWithStatus, 'Pre-Request Variables')}
      {renderVarsTable(resVarsWithStatus, 'Post-Response Variables')}
    </>
  );
};

export default VisualDiffVars;
