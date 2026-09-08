import { useMemo } from 'react';
import { getInheritableEnvironments } from '@usebruno/common/utils';
import { IconBinaryTree2, IconCaretDown } from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import ActionIcon from 'ui/ActionIcon';
import StyledWrapper from './StyledWrapper';

const NO_INHERITANCE_ID = 'no-environment';

const ColorDot = ({ color }) => (
  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color || 'transparent' }} />
);

const InheritsFrom = ({ environment, environments, inheritedEnvironmentName, onChange }) => {
  const inheritableEnvironments = useMemo(
    () => getInheritableEnvironments({ environments, targetEnvironment: environment }),
    [environments, environment]
  );

  const items = useMemo(
    () => [
      {
        name: 'Inherit variables from',
        options: [
          {
            id: NO_INHERITANCE_ID,
            label: 'No Environment',
            leftSection: <ColorDot />,
            onClick: () => onChange(null)
          },
          ...inheritableEnvironments.map((env) => ({
            id: env.name,
            label: env.name,
            leftSection: <ColorDot color={env.color} />,
            onClick: () => inheritedEnvironmentName !== env.name && onChange(env.name)
          }))
        ]
      }
    ],
    [inheritableEnvironments, inheritedEnvironmentName, onChange]
  );

  if (!inheritableEnvironments.length && typeof inheritedEnvironmentName !== 'string') {
    return null;
  }

  return (
    <StyledWrapper>
      <MenuDropdown
        items={items}
        selectedItemId={inheritedEnvironmentName || NO_INHERITANCE_ID}
        data-testid="env-inherits-from"
      >
        {typeof inheritedEnvironmentName === 'string' ? (
          <button type="button" className="inherits-from-pill" data-testid="env-inherits-from-action">
            <IconBinaryTree2 className="inherits-from-icon" size={14} strokeWidth={1.5} />
            <span>Inherits from:</span>
            <span className="inherits-from-name">{inheritedEnvironmentName}</span>
            <IconCaretDown size={12} strokeWidth={2} />
          </button>
        ) : (
          <ActionIcon label="Inherit variables from" data-testid="env-inherits-from-action">
            <IconBinaryTree2 size={15} strokeWidth={1.5} />
          </ActionIcon>
        )}
      </MenuDropdown>
    </StyledWrapper>
  );
};

export default InheritsFrom;
