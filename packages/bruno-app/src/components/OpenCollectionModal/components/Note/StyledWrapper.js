import styled from 'styled-components';
import iconButtonStyles from '../IconButtonStyles';

const StyledWrapper = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  flex: none;
  margin: 0 1.25rem 0.625rem;
  padding: 0.5rem 0.75rem;
  border-radius: ${(props) => props.theme.border.radius.base};
  background: ${(props) => props.theme.status[props.$tone].background};
  font-size: ${(props) => props.theme.font.size.base};
  line-height: 1.5;

  .note-icon {
    flex: none;
    margin-top: 0.1875rem;
    color: ${(props) => props.theme.status[props.$tone].text};
  }

  .note-text {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .note-dismiss {
    width: 1.375rem;
    height: 1.375rem;
    margin: -0.0625rem -0.375rem -0.125rem 0;
    ${iconButtonStyles}
  }
`;

export default StyledWrapper;
