import StyledWrapper from './StyledWrapper';

const IndeterminateProgressBar = ({ active, value, className, 'data-testid': dataTestId }) => {
  const determinate = typeof value === 'number' && !Number.isNaN(value);
  const show = active || determinate;
  const ariaValueNow = determinate ? Math.round(Math.min(1, Math.max(0, value)) * 100) : undefined;

  return (
    <StyledWrapper
      className={className}
      data-testid={dataTestId}
      role={show ? 'progressbar' : undefined}
      aria-busy={show || undefined}
      aria-valuemin={determinate ? 0 : undefined}
      aria-valuemax={determinate ? 100 : undefined}
      aria-valuenow={ariaValueNow}
      $determinate={determinate}
      $progress={determinate ? Math.min(1, Math.max(0, value)) : undefined}
    >
      {show ? <div className="bar" /> : null}
    </StyledWrapper>
  );
};

export default IndeterminateProgressBar;
