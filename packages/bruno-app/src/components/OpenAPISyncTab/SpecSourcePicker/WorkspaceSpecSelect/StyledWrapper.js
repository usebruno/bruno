import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: relative;
  display: flex;
  flex: 1;
  min-width: 0;

  select {
    appearance: none;
  }

  .select-caret {
    position: absolute;
    top: 50%;
    right: calc(0.5rem + 1px);
    transform: translateY(-50%);
    pointer-events: none;
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;
