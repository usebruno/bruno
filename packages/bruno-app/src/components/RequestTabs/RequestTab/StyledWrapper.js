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
    letter-spacing: 0.02em;
    flex-shrink: 0;
  }

  .tab-name {
    position: relative;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: 0.8125rem;

    // so that the name does not cutoff when italicized
    padding-right: 2px;
  }

  // Owning-collection label shown on tabs when tabs-across-collections is enabled, so tabs
  // with the same name/type from different collections stay distinguishable at a glance.
  .tab-collection-name {
    flex-shrink: 0;
    margin-left: 0.375rem;
    font-size: 0.6875rem;
    opacity: 0.55;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 8rem;
  }

  .example-icon {
    color: ${(props) => props.theme.requestTabs.example.iconColor};
  }
`;

export default StyledWrapper;
