import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  flex: none;
  margin: 0 1.25rem 0.625rem;
  padding: 0.5625rem 0.75rem;
  border-radius: ${(props) => props.theme.border.radius.base};
  background: ${(props) => props.theme.status[props.$tone].background};
  font-size: 0.78125rem;
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
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: ${(props) => props.theme.border.radius.base};
    background: none;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;

    &:hover {
      background: ${(props) => props.theme.background.surface1};
      color: ${(props) => props.theme.text};
    }
  }
`;

export default StyledWrapper;
