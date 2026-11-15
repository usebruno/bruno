import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;

  .file-input {
    display: none;
  }

  button.file-pick-btn {
    text-align: left;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;
