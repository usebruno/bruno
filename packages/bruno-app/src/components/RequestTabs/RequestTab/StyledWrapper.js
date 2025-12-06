import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;

  .tab-label {
    overflow: hidden;
    align-items: center;
    position: relative;
    flex: 1;
    min-width: 0;
  }

  .tab-method {
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    flex-shrink: 0;
  }

  .tab-name {
    position: relative;
    overflow: hidden;
    white-space: nowrap;
    font-size: 0.8125rem;
  }
`;

export default StyledWrapper;
