import StyledWrapper from './StyledWrapper';

const IndeterminateProgressBar = ({ active, className, 'data-testid': dataTestId }) => (
  <StyledWrapper
    className={className}
    data-testid={dataTestId}
    role={active ? 'progressbar' : undefined}
    aria-busy={active || undefined}
  >
    {active ? <div className="bar" /> : null}
  </StyledWrapper>
);

export default IndeterminateProgressBar;
