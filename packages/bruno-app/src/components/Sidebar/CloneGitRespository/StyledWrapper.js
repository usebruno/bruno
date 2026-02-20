import styled from 'styled-components';

const StyledWrapper = styled.div`
  .info-box {
    background-color: ${(props) => props.theme.background.mantle};
    color: ${(props) => props.theme.text};
    border: 1px solid ${(props) => props.theme.border.border2};
    padding: 10px;
    border-radius: 5px;
    margin-top: 5px;
    width: 400px;
    white-space: pre-wrap;
    max-height: 150px;
    overflow-y: auto;
  }
`;

export default StyledWrapper;
