import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 20;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow-y: auto;
  background-color: rgba(0, 0, 0, 0.5);
  color: ${(props) => props.theme.text};
  font-size: ${(props) => props.theme.font.size.base};

  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    will-change: opacity;
    animation: fade-in 0.1s forwards cubic-bezier(0.19, 1, 0.22, 1);

    &:before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: black;
      opacity: ${(props) => props.theme.modal.backdrop.opacity};
    }
  }

  .modal-card {
    position: relative;
    z-index: 11;
    display: flex;
    flex-shrink: 0;
    width: 52.5rem;
    max-width: calc(100vw - 2rem);
    height: 35rem;
    max-height: calc(100vh - 6.25rem);
    margin-top: 3.125rem;
    margin-bottom: 3vh;
    overflow: hidden;
    background: ${(props) => props.theme.modal.body.bg};
    border: 0.0625rem solid ${(props) => props.theme.border.border0};
    border-radius: ${(props) => props.theme.border.radius.base};
    will-change: opacity, transform;
    animation: fade-and-slide-in-from-top 0.5s forwards cubic-bezier(0.19, 1, 0.22, 1);

    &:focus {
      outline: none;
    }
  }

  .modal-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .modal-page {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .modal-page-content {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
`;

export default StyledWrapper;
