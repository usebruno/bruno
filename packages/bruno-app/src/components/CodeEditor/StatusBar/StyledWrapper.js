import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  flex-shrink: 0;
  padding: 3px 10px;
  font-size: 11px;
  color: ${(props) => props.theme.colors.text.muted};
  background: ${(props) => props.theme.background.crust};
  border-bottom-left-radius: ${(props) => props.theme.border.radius.sm};
  border-bottom-right-radius: ${(props) => props.theme.border.radius.sm};
  border-top: 1px solid ${(props) => props.theme.border.border0};

  .status-left {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .status-toggle {
    flex-shrink: 0;
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    color: ${(props) => props.theme.colors.text.muted};
    text-decoration: underline;
    cursor: pointer;

    &:hover {
      color: ${(props) => props.theme.textLink};
    }
  }
`;

export default StyledWrapper;
