import styled from 'styled-components';

const StyledWrapper = styled.div`
  width: 260px;
  padding: 8px 10px;
  font-size: ${(props) => props.theme.font.size.xs};
  line-height: 1.25rem;
  color: ${(props) => props.theme.text};
  background-color: ${(props) => props.theme.infoTip.bg};
  border: 1px solid ${(props) => props.theme.infoTip.border};
  box-shadow: ${(props) => props.theme.infoTip.boxShadow};
  border-radius: 4px;

  .tooltip-action {
    margin-top: 0.25rem;
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    color: ${(props) => props.theme.textLink};
    cursor: pointer;
  }

  .tooltip-action:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`;

export default StyledWrapper;
