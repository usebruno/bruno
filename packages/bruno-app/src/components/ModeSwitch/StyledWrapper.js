import styled from 'styled-components';
import { transparentize } from 'polished';

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  border-radius: ${(props) => props.theme.border.radius.base};
  overflow: hidden;
  border: 1px solid ${(props) => props.theme.dropdown.separator};

  /* Button component wraps the button in a div. We need them to be flush. */
  > div {
    display: flex;
  }

  button {
    border-radius: 0;
    border: none;
    color: ${(props) => props.theme.colors.text.muted};
    font-weight: 400;

    &:hover {
      color: ${(props) => props.theme.text};
      background: ${(props) => props.theme.dropdown.hoverBg};
    }
  }

  .is-active button {
    color: ${(props) => props.theme.button2.color['primary']?.bg};
    background: ${(props) => transparentize(1 - 0.12, props.theme.dropdown.selectedColor)};
    
    &:hover {
      background: ${(props) => transparentize(1 - 0.12, props.theme.dropdown.selectedColor)};
    }
  }
`;

export default StyledWrapper;
