import React, { useMemo } from 'react';
import { stripEnvVarUid } from 'utils/environments';

const belongsToTab = (variable, isSecret) => (isSecret ? !!variable.secret : !variable.secret);

const useEnvironmentTabs = ({ environment, draft }) =>
  useMemo(() => {
    const environmentsDraft = draft?.environmentUid === environment?.uid ? draft : null;

    const isTabDirty = (isSecret) => {
      if (!environmentsDraft?.variables) return false;
      const normalize = (list) =>
        JSON.stringify((list || []).filter((v) => belongsToTab(v, isSecret)).map(stripEnvVarUid));
      return normalize(environmentsDraft.variables) !== normalize(environment?.variables);
    };

    // Reflects the live draft while editing, else the saved values.
    const liveVariables = environmentsDraft?.variables || environment?.variables || [];
    const countForTab = (isSecret) =>
      liveVariables.filter((v) => belongsToTab(v, isSecret) && v.enabled && v.name && v.name.trim() !== '').length;

    const tabIndicator = (isSecret) => {
      const count = countForTab(isSecret);
      if (count === 0) return null;
      return (
        <sup
          className={`env-tab-count font-medium${isTabDirty(isSecret) ? ' unsaved' : ''}`}
          data-testid="env-tab-count"
        >
          {count}
        </sup>
      );
    };

    return [
      { key: 'variables', label: 'Variables', indicator: tabIndicator(false) },
      { key: 'secrets', label: 'Secrets', indicator: tabIndicator(true) }
    ];
  }, [draft, environment?.uid, environment?.variables]);

export default useEnvironmentTabs;
