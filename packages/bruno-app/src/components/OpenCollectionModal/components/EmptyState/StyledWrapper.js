import styled from 'styled-components';

const StyledWrapper = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 3rem 3rem;
  overflow-y: auto;

  .empty-state {
    margin: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.625rem;
    text-align: center;
  }

  .empty-state-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    margin-bottom: 0.25rem;
    border-radius: 50%;
    background: ${(props) => props.theme.background.surface0};
    color: ${(props) => props.theme.colors.text.muted};
  }

  .empty-state-title {
    margin: 0;
    font-size: ${(props) => props.theme.font.size.md};
    font-weight: 600;
  }

  .empty-state-text {
    max-width: 25rem;
    margin: 0;
    font-size: ${(props) => props.theme.font.size.base};
    line-height: 1.55;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .empty-state-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 17.5rem;
    max-width: 100%;
    margin-top: 0.625rem;
  }

  .empty-state-foot {
    margin: 0.5rem 0 0;
    font-size: ${(props) => props.theme.font.size.base};
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;
