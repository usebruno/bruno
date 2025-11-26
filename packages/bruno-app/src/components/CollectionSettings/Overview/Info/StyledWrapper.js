import styled from 'styled-components';

const StyledWrapper = styled.div`
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;

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
