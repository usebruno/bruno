import React, { useMemo, useState } from 'react';
import { IconEye, IconEyeOff } from '@tabler/icons';
import { getEffectiveRequestVariables, maskInputValue } from 'utils/collections';
import StyledWrapper from './StyledWrapper';

const EffectiveVarsTable = ({ item, collection }) => {
  const [showSecret, setShowSecret] = useState(false);

  const variables = useMemo(
    () => getEffectiveRequestVariables(collection, item),
    [
      item?.uid,
      item?.draft,
      item?.request,
      collection?.uid,
      collection?.activeEnvironmentUid,
      collection?.environments,
      collection?.root,
      collection?.draft,
      collection?.items
    ]
  );

  if (!variables.length) {
    return (
      <StyledWrapper className="w-full">
        <div className="empty-state">
          No effective variables for this request. Define variables on the collection, folder, request or environment to see them here.
        </div>
      </StyledWrapper>
    );
  }

  const hasSecret = variables.some((v) => v.secret);

  return (
    <StyledWrapper className="w-full">
      {hasSecret ? (
        <div
          className="secret-toggle mb-2"
          role="button"
          tabIndex={0}
          onClick={() => setShowSecret((s) => !s)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setShowSecret((s) => !s);
            }
          }}
        >
          {showSecret ? <IconEyeOff size={16} strokeWidth={1.5} /> : <IconEye size={16} strokeWidth={1.5} />}
          <span>{showSecret ? 'Hide secret variable values' : 'Show secret variable values'}</span>
        </div>
      ) : null}
      <table>
        <thead>
          <tr>
            <th style={{ width: '30%' }}>Name</th>
            <th style={{ width: '50%' }}>Value</th>
            <th style={{ width: '20%' }}>Source</th>
          </tr>
        </thead>
        <tbody>
          {variables.map((v) => (
            <tr key={v.name}>
              <td>{v.name}</td>
              <td>{v.secret && !showSecret ? maskInputValue(String(v.value ?? '')) : String(v.value ?? '')}</td>
              <td>
                <span className="source-tag">{v.source}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </StyledWrapper>
  );
};

export default EffectiveVarsTable;
