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
    align-self: flex-start;
    user-select: none;

    .checkbox-label {
      color: ${(props) => props.theme.colors.text.muted};
    }

    &:hover .checkbox-label {
      color: ${(props) => props.theme.text};
    }
  }
`;

export default StyledWrapper;
