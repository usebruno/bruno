import styled from 'styled-components';

const StyledWrapper = styled.div`
  border-left: solid 1px ${(props) => props.theme.border.border2};

  .label-toolbar {
    border-bottom: solid 1px ${(props) => props.theme.border.border2};

    select {
      border: solid 1px ${(props) => props.theme.border.border2};
      border-radius: ${(props) => props.theme.border.radius.sm};
      background-color: ${(props) => props.theme.background.base};
      color: ${(props) => props.theme.text};
    }
  }

  .label-image {
    max-width: 100%;
    /* A label is printed on white stock, so its preview stays white in every theme */
    background: #fff;
    border: solid 1px ${(props) => props.theme.border.border2};
  }

  .muted {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .error {
    color: ${(props) => props.theme.colors.text.danger};
  }
`;

export default StyledWrapper;
