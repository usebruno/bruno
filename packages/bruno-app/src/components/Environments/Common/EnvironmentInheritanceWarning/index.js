import { Fragment, memo, useMemo } from 'react';
import { IconAlertTriangle } from '@tabler/icons';
import { getInheritedEnvironments } from '@usebruno/common/utils';
import StyledWrapper from './StyledWrapper';

const EnvironmentName = ({ name }) => <span className="environment-name">{name}</span>;

const getInheritanceWarning = ({ missingInheritedEnvironmentName, cyclicInheritancePath }) => {
  if (missingInheritedEnvironmentName) {
    return {
      testId: 'env-missing-inherited-environment',
      content: (
        <>
          Referenced parent environment not found: <EnvironmentName name={missingInheritedEnvironmentName} />
        </>
      )
    };
  }

  if (cyclicInheritancePath) {
    return {
      testId: 'env-cyclic-inherited-environment',
      content: (
        <>
          Circular inheritance:{' '}
          {cyclicInheritancePath.map((name, index) => (
            <Fragment key={index}>
              {index > 0 && ' → '}
              <EnvironmentName name={name} />
            </Fragment>
          ))}
        </>
      )
    };
  }

  return null;
};

const EnvironmentInheritanceWarning = ({ environment, environments }) => {
  const warning = useMemo(
    () => getInheritanceWarning(getInheritedEnvironments({ environments: environments || [], environment })),
    [environments, environment]
  );

  if (!warning) {
    return null;
  }

  return (
    <StyledWrapper data-testid={warning.testId}>
      <IconAlertTriangle size={16} strokeWidth={1.5} className="warning-icon" />
      <span>{warning.content}</span>
    </StyledWrapper>
  );
};

export default memo(EnvironmentInheritanceWarning);
