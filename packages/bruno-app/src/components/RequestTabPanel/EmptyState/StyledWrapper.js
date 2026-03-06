import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 32px 20px;
  }

  .empty-icon {
    color: ${(props) => props.theme.colors.text.muted};
    margin-bottom: 16px;

    &.error {
      color: ${(props) => props.theme.colors.text.danger};
    }
  }

  .empty-title {
    font-size: ${(props) => props.theme.font.size.md};
    font-weight: 500;
    color: ${(props) => props.theme.text};
    margin-bottom: 8px;
  }

  .empty-description {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
    max-width: 300px;
  }
`;

export default StyledWrapper;
