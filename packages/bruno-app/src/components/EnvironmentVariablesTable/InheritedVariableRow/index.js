import React, { useState } from 'react';
import { IconArrowUpRight } from '@tabler/icons';
import { valueToString } from '@usebruno/common/utils';
import SecretEyeButton from 'components/MultiLineEditor/SecretEyeButton';
import { useEnvironmentSelection } from 'hooks/useEnvironmentSelection';
import { EnabledCell, NameCell, ValueCell, DescriptionCell, SourceCell } from './StyledWrapper';

const MASK_CHARACTER = '*';
const maskValue = (value) => value.replace(/[^\n]/g, MASK_CHARACTER);

const InheritedVariableRow = ({ variable, columnWidths }) => {
  const [masked, setMasked] = useState(true);
  const { environments, onSelect } = useEnvironmentSelection();
  const value = valueToString(variable.value, 2);
  const isMasked = !!variable.secret && masked;

  const openInheritedEnvironment = () => {
    const inheritedEnvironment = environments?.find((env) => env.uid === variable.inheritedFrom.uid);
    if (inheritedEnvironment) {
      onSelect(inheritedEnvironment);
    }
  };

  return (
    <>
      <EnabledCell className="text-center">
        <input type="checkbox" checked={variable.enabled !== false} disabled readOnly />
      </EnabledCell>
      <NameCell style={{ width: columnWidths.name }}>
        <span className="inherited-name">{variable.name}</span>
      </NameCell>
      <ValueCell style={{ width: columnWidths.value }} className="overflow-hidden">
        <div className="inherited-value-cell">
          <div className="inherited-value">{isMasked ? maskValue(value) : value}</div>
          <span className="inherited-data-type" data-testid="inherited-data-type">
            {variable.dataType || 'string'}
          </span>
          {variable.secret && (
            <SecretEyeButton
              masked={masked}
              testId="inherited-secret-reveal-toggle"
              onToggle={() => setMasked((prev) => !prev)}
            />
          )}
        </div>
      </ValueCell>
      <DescriptionCell style={{ width: columnWidths.description }}>
        <span className="inherited-description">{variable.description}</span>
      </DescriptionCell>
      <SourceCell>
        <button
          type="button"
          className="inherited-source"
          title={`Inherited from ${variable.inheritedFrom.name}`}
          data-testid="inherited-source"
          onClick={openInheritedEnvironment}
        >
          <IconArrowUpRight size={16} strokeWidth={1.5} />
        </button>
      </SourceCell>
    </>
  );
};

export default React.memo(InheritedVariableRow);
