import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;

  .tab-label {
    overflow: hidden;
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

  li:hover & .tab-name{
    mask-image: linear-gradient(
      to right,
      black 0%,
      black calc(100% - 8px),
      transparent 100%
    );
    -webkit-mask-image: linear-gradient(
      to right,
      black 0%,
      black calc(100% - 8px),
      transparent 100%
    );
  }
`;

export default StyledWrapper;
