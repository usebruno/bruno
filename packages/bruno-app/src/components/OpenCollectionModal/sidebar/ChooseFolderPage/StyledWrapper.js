import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;

  .choose-folder-content {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .choose-folder-start {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    padding: 0.25rem 1.25rem 1.25rem;
  }

  .choose-folder-auto-open {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    align-self: flex-start;
    font-size: ${(props) => props.theme.font.size.base};
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
    user-select: none;

    input {
      margin: 0;
      cursor: pointer;
    }

    &:hover {
      color: ${(props) => props.theme.text};
    }
  }
`;

export default StyledWrapper;
