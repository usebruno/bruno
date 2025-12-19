import styled from 'styled-components';

const StyledWrapper = styled.div`
  .toggle-label {
    color: ${(props) => props.theme.toggleSelector.label};
  }

  .toggle-description {
    color: ${(props) => props.theme.toggleSelector.description};
  }

  .toggle-switch {
    &.checked {
      background-color: ${(props) => props.theme.toggleSelector.switch.checked};
    }

    &:not(.checked) {
      background-color: ${(props) => props.theme.toggleSelector.switch.unchecked};
    }
  }
`;

export default StyledWrapper;
