import styled from 'styled-components';

const StyledWrapper = styled.div`
  width: max-content;
  padding: 0.25rem;
  box-sizing: border-box;
  color: ${(props) => props.theme.dropdown.color};
  background-color: ${(props) => props.theme.dropdown.bg};
  border-radius: ${(props) => props.theme.border.radius.base};
  font-size: ${(props) => props.theme.font.size.base};
  ${(props) =>
    props.theme.dropdown.border && props.theme.dropdown.border !== 'none'
      ? `border: 1px solid ${props.theme.dropdown.border};`
      : ''}
  ${(props) =>
    props.theme.dropdown.shadow && props.theme.dropdown.shadow !== 'none'
      ? `box-shadow: ${props.theme.dropdown.shadow};`
      : ''}

  .var-set-bar {
    display: block;
    width: 100%;
    background: transparent;
    border: none;
    border-radius: ${(props) => props.theme.border.radius.base};
    padding: 0.3125rem 0.625rem;
    color: ${(props) => props.theme.dropdown.color};
    font-size: inherit;
    text-align: left;
    white-space: nowrap;
    cursor: pointer;

    &:hover {
      background: ${(props) => props.theme.dropdown.hoverBg};
    }
  }
`;

export default StyledWrapper;
