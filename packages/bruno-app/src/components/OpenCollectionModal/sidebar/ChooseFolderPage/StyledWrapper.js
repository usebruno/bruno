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
    padding: 0.25rem 1.25rem 1.25rem;
  }

  .choose-folder-shortcut {
    margin-left: 0.5rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;
