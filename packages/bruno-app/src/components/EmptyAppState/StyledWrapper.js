import styled from 'styled-components';

const StyledWrapper = styled.div`
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed ${(props) => props.theme.border.border1};
  border-radius: 4px;
  color: ${(props) => props.theme.colors.text.muted};

  .empty-app-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 2rem;
    text-align: center;
    max-width: 360px;
  }

  .empty-app-title {
    font-size: 13px;
    font-weight: 500;
    color: ${(props) => props.theme.text};
  }

  .empty-app-hint {
    font-size: 12px;
    line-height: 1.4;
  }

  .empty-app-actions {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
`;

export default StyledWrapper;
