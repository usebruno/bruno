import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.$gap};
  min-width: 0;

  &.settings-list--dividers {
    gap: 0;

    > * {
      padding: ${(props) => props.$gap} 0;
    }

    > *:first-child {
      padding-top: 0;
    }

    > *:last-child {
      padding-bottom: 0;
    }

    > * + * {
      border-top: 1px solid ${(props) => props.theme.border.border0};
    }
  }
`;

export default StyledWrapper;
