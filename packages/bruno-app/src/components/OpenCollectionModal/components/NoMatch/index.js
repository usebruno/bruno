import StyledWrapper from './StyledWrapper';

const NoMatch = ({ query, children, action, 'data-testid': testId }) => (
  <StyledWrapper data-testid={testId}>
    <h4 className="no-match-title">No collection matches “{query}”</h4>
    <p className="no-match-text">{children}</p>
    {action}
  </StyledWrapper>
);

export default NoMatch;
