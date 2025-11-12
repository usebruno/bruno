import styled from 'styled-components';

const StyledWrapper = styled.div`
  .single-line-editor-wrapper {
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    border: solid 1px ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.input.bg};

    &.error{
      border-color: ${(props) => props.theme.colors.text.danger};
    }
  }

  .tooltip-mod {
    font-size: 11px !important;
    width: 150px !important;

    & ul {
      padding-left: 4px;
    }

    & ul > li {
      list-style: circle;
    }
  }
`;

export default StyledWrapper;
