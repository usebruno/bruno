import styled from 'styled-components';

const StyledWrapper = styled.div`
  .add-btn {
    border-color: ${(props) => props.theme.border.border1};
    color: ${(props) => props.theme.text};

    &:hover {
      background-color: ${(props) => props.theme.workspace.button.bg};
    }
  }

  .subscribe-btn {
    color: white;
    background-color: ${(props) => props.theme.colors.text.green};

    &:hover {
      opacity: 0.9;
    }

    &:disabled {
      opacity: 0.5;
    }
  }

  .unsubscribe-btn {
    color: white;
    background-color: ${(props) => props.theme.colors.text.danger};

    &:hover {
      opacity: 0.9;
    }
  }

  .remove-btn {
    color: ${(props) => props.theme.colors.text.subtext0};

    &:hover {
      color: ${(props) => props.theme.colors.text.danger};
    }
  }

  .empty-text {
    color: ${(props) => props.theme.colors.text.subtext0};
  }

  .help-text {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .sub-row {
    border-color: ${(props) => props.theme.border.border1};
  }
`;

export default StyledWrapper;
