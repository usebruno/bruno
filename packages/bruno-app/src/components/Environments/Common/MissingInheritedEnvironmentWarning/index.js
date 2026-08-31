import { useMemo } from 'react';
import { IconAlertTriangle } from '@tabler/icons';
import { getInheritedEnvironments } from '@usebruno/common/utils';
import StyledWrapper from './StyledWrapper';

const MissingInheritedEnvironmentWarning = ({ environment, environments }) => {
  const { missingInheritedEnvironmentName } = useMemo(
    () => getInheritedEnvironments({ environments: environments || [], environment }),
    [environments, environment]
  );

  if (!missingInheritedEnvironmentName) {
    return null;
  }

  return (
    <StyledWrapper data-testid="env-missing-inherited-environment">
      <IconAlertTriangle size={16} strokeWidth={1.5} className="warning-icon" />
      <span>
        Referenced parent environment not found:{' '}
        <span className="missing-name">{missingInheritedEnvironmentName}</span>
      </span>
    </StyledWrapper>
  );
};

export default MissingInheritedEnvironmentWarning;
