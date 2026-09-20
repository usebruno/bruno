import StyledWrapper from './StyledWrapper';

/**
 * A thin sweeping bar for work whose duration is not known ahead of time — indexing a workspace,
 * resolving a search. Spans the full width of whatever contains it.
 *
 * The track keeps its height whether or not it is active, so showing and hiding it never shifts the
 * content below.
 */
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
