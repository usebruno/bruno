import styled from 'styled-components';

const StyledWrapper = styled.div`
  .caret {
    color: ${(props) => props.theme.app.collection.toolbar.environmentSelector.caret};
    fill: ${(props) => props.theme.app.collection.toolbar.environmentSelector.caret};
  }

  .button-dropdown-button {
    color: ${(props) => props.theme.text};
    border-color: ${(props) => props.theme.workspace.border};

  }

  .dropdown-divider {
    background-color: ${(props) => props.theme.dropdown.separator};
    height: 1px;
    margin: 4px 0;
  }

  .active {
    color: ${(props) => props.theme.primary.text};
  }

  .icon-muted {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .preview-response-tab-label {
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;
