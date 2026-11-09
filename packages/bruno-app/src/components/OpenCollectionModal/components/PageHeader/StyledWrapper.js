import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex: none;
  min-height: 3.625rem;
  padding: 0.75rem 0.75rem 0.75rem 1.25rem;

  .page-header-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  h3 {
    margin: 0;
    font-size: ${(props) => props.theme.font.size.md};
    font-weight: 600;
  }

  .page-header-description {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .close-button {
    width: 1.75rem;
    height: 1.75rem;
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
