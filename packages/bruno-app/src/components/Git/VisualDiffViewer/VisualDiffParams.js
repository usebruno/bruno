import React, { useMemo } from 'react';
import get from 'lodash/get';
import { useTranslation } from 'react-i18next';

const VisualDiffParams = ({ oldData, newData, showSide }) => {
  const { t } = useTranslation();
  const oldParams = get(oldData, 'request.params', []);
  const newParams = get(newData, 'request.params', []);

  const currentParams = showSide === 'old' ? oldParams : newParams;
  const otherParams = showSide === 'old' ? newParams : oldParams;

  const paramsWithStatus = useMemo(() => {
    const otherParamMap = new Map();
    otherParams.forEach((p) => {
      otherParamMap.set(p.name, p);
    });

    return currentParams.map((param) => {
      const otherParam = otherParamMap.get(param.name);

      let status = 'unchanged';
      if (!otherParam) {
        status = showSide === 'old' ? 'deleted' : 'added';
      } else if (param.value !== otherParam.value || param.enabled !== otherParam.enabled) {
        status = 'modified';
      }

      return { ...param, status };
    });
  }, [currentParams, otherParams, showSide]);

  const queryParams = paramsWithStatus.filter((p) => p.type === 'query');
  const pathParams = paramsWithStatus.filter((p) => p.type === 'path');

  if (queryParams.length === 0 && pathParams.length === 0) {
    return null;
  }

  const renderTable = (params, title) => {
    if (params.length === 0) return null;

    return (
      <div className="diff-section">
        <div className="diff-section-header">{title}</div>
        <table className="diff-table">
          <thead>
            <tr>
              <th style={{ width: '30px' }}></th>
              <th className="checkbox-cell"></th>
              <th style={{ width: '40%' }}>{t('GIT.VISUAL_DIFF.TABLE.KEY')}</th>
              <th>{t('GIT.VISUAL_DIFF.TABLE.VALUE')}</th>
            </tr>
          </thead>
          <tbody>
            {params.map((param, index) => (
              <tr key={`${param.name}-${index}`} className={param.status}>
                <td>
                  {param.status !== 'unchanged' && (
                    <span className={`status-badge ${param.status}`}>
                      {param.status === 'added' ? 'A' : param.status === 'deleted' ? 'D' : 'M'}
                    </span>
                  )}
                </td>
                <td className="checkbox-cell">
                  <input
                    type="checkbox"
                    checked={param.enabled !== false}
                    readOnly
                    disabled
                  />
                </td>
                <td className="key-cell">{param.name}</td>
                <td className="value-cell">{param.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
      {renderTable(queryParams, t('GIT.VISUAL_DIFF.QUERY_PARAMETERS'))}
      {renderTable(pathParams, t('GIT.VISUAL_DIFF.PATH_PARAMETERS'))}
    </>
  );
};

export default VisualDiffParams;
