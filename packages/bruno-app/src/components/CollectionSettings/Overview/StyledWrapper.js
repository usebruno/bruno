import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .overview-flex {
    display: flex;
    gap: 24px;
    height: 100%;
    overflow: hidden;
    align-items: flex-start;
  }

  .overview-left {
    flex: 0 0 auto;
    width: 40%;
    max-width: 40%;
    min-width: 0;
    transition: width 0.3s ease, max-width 0.3s ease;

    &.collapsed {
      width: 80px;
      max-width: 80px;
      min-width: 80px;
    }
  }

  .overview-right {
    flex: 1 1 auto;
    min-width: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    transition: flex 0.3s ease;
  }

  .overview-card {
    background-color: ${(props) => props.theme.bg};
    border: 1px solid ${(props) => {
      const themeBorder = props.theme.table?.border || props.theme.requestTabPanel?.cardTable?.border || props.theme.requestTabPanel?.card?.border;
      // Use a more visible border color in light mode
      const isLightMode = props.theme.bg === '#fff' || props.theme.bg === 'white' || props.theme.mode === 'light';
      if (themeBorder && themeBorder !== '#efefef') return themeBorder;
      return isLightMode ? '#d1d5db' : '#efefef';
    }};
    border-radius: 8px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    height: fit-content;
    max-height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    position: relative;
    transition: padding 0.3s ease;
  }

  .overview-left.collapsed .overview-card {
    padding: 20px 8px;
    align-items: center;
    height: fit-content;
    min-height: fit-content;
  }

  .separator {
    border-top: 1px solid ${(props) => {
      const themeBorder = props.theme.table?.border || props.theme.requestTabPanel?.cardTable?.border;
      // Use a more visible separator color in light mode
      const isLightMode = props.theme.bg === '#fff' || props.theme.bg === 'white' || props.theme.mode === 'light';
      if (themeBorder && themeBorder !== '#efefef') return themeBorder;
      return isLightMode ? '#d1d5db' : '#efefef';
    }};
    margin: 16px 0;
    flex-shrink: 0;
  }
`;

export default StyledWrapper;
