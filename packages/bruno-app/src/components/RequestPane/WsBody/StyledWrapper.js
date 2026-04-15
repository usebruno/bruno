import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;

  .messages-container {
    flex: 1;
    overflow-y: auto;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 12px;

    p {
      color: ${(props) => props.theme.colors.text.muted};
      font-size: 13px;
    }
  }

  .add-message-link {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.875rem;
    color: ${(props) => props.theme.request.ws};
    cursor: pointer;
    background: none;
    border: none;
    padding: 4px 0;

    &:hover {
      opacity: 0.8;
    }
  }
`;

export default Wrapper;
