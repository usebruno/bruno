import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  position: relative;

  .messages-container {
    flex: 1;
    display: flex;
    flex-direction: column;

    &.single {
      height: 100%;
    }

    &.multi {
      overflow-y: auto;
      padding-bottom: 48px;
    }
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

  .add-message-footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 8px;
    background: ${(props) => props.theme.bg};
  }
`;

export default Wrapper;
