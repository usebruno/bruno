import styled from 'styled-components';

const StyledWrapper = styled.div`
  .tab-label {
    position: relative;
    overflow: visible;
    flex: 1;
    min-width: 0;
  }

  .tab-name {
    position: relative;
    overflow: hidden;
    white-space: nowrap;
    font-size: 12px;
    flex: 1;
    min-width: 0;
    padding-right: 22px;
    z-index: 1;
  }

  .request-tab & .tab-name::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 20px;
    height: 100%;
    background: linear-gradient(to right, transparent, ${(props) => props.theme.requestTabs.bg});
    pointer-events: none;
  }

  .request-tab.active & .tab-name::after {
    background: linear-gradient(to right, transparent, ${(props) => props.theme.requestTabs.active.bg});
  }

  .tab-method {
    font-size: 10px;
    z-index: 0;
  }

  .request-tab & .close-gradient {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 2px;
    position: absolute;
    width: 36px;
    height: 100%;
    right: -4px;
    top: 50%;
    transform: translateY(-50%);
    background: linear-gradient(90deg, transparent 0%, ${(props) => props.theme.requestTabs.bg} 40%);
    z-index: 2;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.12s linear;
  }

  .request-tab.active & .close-gradient {
    background: linear-gradient(90deg, transparent 0%, ${(props) => props.theme.requestTabs.active.bg} 40%);
  }

  .close-icon-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 16px;
    height: 16px;
    background: rgba(140, 140, 140, 0.2);
    border-radius: 3px;
  }

  .request-tab:hover & .close-gradient {
    opacity: 1;
    pointer-events: auto;

    .tab-method {
      font-size: ${(props) => props.theme.font.size.sm};
    }
  }
`;

export default StyledWrapper;
