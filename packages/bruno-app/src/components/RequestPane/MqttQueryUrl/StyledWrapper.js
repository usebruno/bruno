import styled from 'styled-components';

const StyledWrapper = styled.div`
  .connect-btn {
    color: white;
    background-color: ${(props) => props.theme.colors.text.green};

    &:hover {
      opacity: 0.9;
    }

    &:disabled {
      opacity: 0.6;
    }
  }

  .disconnect-btn {
    color: white;
    background-color: ${(props) => props.theme.colors.text.danger};

    &:hover {
      opacity: 0.9;
    }
  }

  .save-btn {
    border-color: ${(props) => props.theme.border.border1};
    color: ${(props) => props.theme.text};

    &:hover {
      background-color: ${(props) => props.theme.workspace.button.bg};
    }
  }

  .url-input {
    border-color: ${(props) => props.theme.border.border1};
    background-color: ${(props) => props.theme.requestTabPanel.url.bg};
    color: ${(props) => props.theme.text};
  }
`;

export default StyledWrapper;
