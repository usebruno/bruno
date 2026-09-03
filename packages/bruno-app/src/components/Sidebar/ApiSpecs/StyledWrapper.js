import styled from 'styled-components';
import sidebarRowStyles from 'components/Sidebar/SidebarRowStyles';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 0%;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  padding-top: 4px;
  padding-bottom: 4px;

  .api-specs-list {
    flex: 1 1 0%;
    min-height: 0;
    padding-top: 4px;
    padding-bottom: 4px;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .api-spec-item {
    ${sidebarRowStyles({ selectedClass: 'active', keyboardFocusedClass: 'api-spec-keyboard-focused' })}
  }

  .placeholder {
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default Wrapper;
