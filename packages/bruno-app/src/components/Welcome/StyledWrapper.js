import styled from 'styled-components';

const StyledWrapper = styled.div`
  .heading {
    color: ${(props) => props.theme.welcome.heading};
    font-size: ${(props) => props.theme.font.size.base};
  }

  .muted {
    color: ${(props) => props.theme.welcome.muted};
  }

  .collection-options {
    cursor: pointer;

    svg {
      position: relative;
      top: -1px;
    }

    .label {
      &:hover {
        text-decoration: underline;
      }
    }
  }

  .keycap {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 1px 6px;
    border: 1px solid ${(props) => props.theme.modal.input.border};
    border-radius: 4px;
    background: ${(props) =>
      props.theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'};
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 500;
    font-family: inherit;
    line-height: 1;
    color: ${(props) => props.theme.text};
  }
`;

export default StyledWrapper;
